from __future__ import absolute_import
from collections import defaultdict
from copy import deepcopy
import json
import logging
from django.http import (
    HttpResponse,
    HttpResponseNotAllowed,
    HttpResponseBadRequest,
    JsonResponse,
)
from django.conf import settings

from omeroweb.webclient.decorators import login_required
import omero
from omero.rtypes import rstring, unwrap
from omeroweb.webclient import tree
from .utils import create_tag_annotations_links
from omero.constants.metadata import NSINSIGHTTAGSET

logger = logging.getLogger(__name__)


@login_required(setGroupContext=True)
def process_update(request, conn=None, **kwargs):

    if not request.POST:
        return HttpResponseNotAllowed("Methods allowed: POST")

    items = json.loads(request.POST.get("change"))
    itemType = request.POST.get("itemType").capitalize()

    if itemType == "Run":
        itemType = "PlateAcquisition"

    additions = []
    removals = []

    for item in items:
        oid = item["itemId"]

        additions.extend(
            [(int(oid), int(addition),) for addition in item["additions"]]
        )

        removals.extend(
            [(int(oid), int(removal),) for removal in item["removals"]]
        )

    # TODO Interface for create_tag_annotations_links is a bit nasty, but go
    # along with it for now
    create_tag_annotations_links(conn, itemType, additions, removals)

    return HttpResponse("")


@login_required(setGroupContext=True)
def create_tag(request, conn=None, **kwargs):
    """
    Creates a Tag from POST data.
    """

    if not request.POST:
        return HttpResponseNotAllowed("Methods allowed: POST")

    tag = json.loads(request.body)

    tag_value = tag["value"]
    tag_description = tag["description"]

    tag = omero.model.TagAnnotationI()
    tag.textValue = rstring(str(tag_value))
    if tag_description is not None:
        tag.description = rstring(str(tag_description))

    tag = conn.getUpdateService().saveAndReturnObject(tag, conn.SERVICE_OPTS)

    params = omero.sys.ParametersI()
    service_opts = deepcopy(conn.SERVICE_OPTS)

    qs = conn.getQueryService()

    q = """
        select new map(tag.id as id,
               tag.textValue as value,
               tag.description as description,
               tag.details.owner.id as ownerId,
               tag as tag_details_permissions,
               tag.ns as ns,
               (select count(aalink2)
                from AnnotationAnnotationLink aalink2
                where aalink2.child.class=TagAnnotation
                and aalink2.parent.id=tag.id) as childCount)
        from TagAnnotation tag
        where tag.id = :tid
        """

    params.addLong("tid", tag.id)

    e = qs.projection(q, params, service_opts)[0]
    e = unwrap(e)[0]
    e["permsCss"] = tree.parse_permissions_css(
        e["tag_details_permissions"],
        e["ownerId"], conn)
    del e["tag_details_permissions"]

    e["set"] = (
        e["ns"]
        and tree.unwrap_to_str(e["ns"]) == NSINSIGHTTAGSET
    )

    return JsonResponse(e)


@login_required(setGroupContext=True)
def get_items(request, conn=None, **kwargs):
    # According to REST, this should be a GET, but because of the amount of
    # data being submitted, this is problematic
    if request.method != "POST":
        return HttpResponseNotAllowed("Methods allowed: POST")

    itemType = request.POST.get("itemType", "image").capitalize()
    if itemType == "Run":
        # PlateAcquisition is displayed as 'Run' in the UI
        itemType = "PlateAcquisition"

    try:
        item_ids = json.loads(request.POST.get("ids") or b"[]")
        if not isinstance(item_ids, list) or not item_ids:
            return HttpResponseBadRequest("Item IDs required")
    except json.JSONDecodeError:
        return HttpResponseBadRequest("Invalid request format")
    try:
        item_ids = list(map(int, item_ids))
    except (TypeError, ValueError):
        return HttpResponseBadRequest("Invalid ids; must be integers")

    group_id = request.session.get("active_group")
    if group_id is None:
        group_id = conn.getEventContext().groupId

    # All the tags available to the user
    tags = []
    page = 1
    while True:
        next_tags = tree.marshal_tags(conn, group_id=group_id, page=page)
        tags.extend(next_tags)
        if len(next_tags) < settings.PAGE:
            break
        page += 1

    # Details about the items specified
    params = omero.sys.ParametersI()
    service_opts = deepcopy(conn.SERVICE_OPTS)

    # Set the desired group context
    service_opts.setOmeroGroup(group_id)

    params.addLongs("oids", item_ids)

    qs = conn.getQueryService()

    # Get the tags that are applied to individual images
    q = f"""
        SELECT DISTINCT itlink.parent.id, itlink.child.id
        FROM {itemType}AnnotationLink itlink
        WHERE itlink.child.class=TagAnnotation
        AND itlink.parent.id IN (:oids)
        """

    tags_on_items = defaultdict(list)
    for e in qs.projection(q, params, service_opts):
        tags_on_items[unwrap(e[0])].append(unwrap(e[1]))

    if itemType == "Image":
        # Get the images' details
        q = """
            SELECT new map(image.id AS id,
                image.name AS name,
                image.details.owner.id AS ownerId,
                image AS image_details_permissions,
                image.fileset.id AS filesetId,
                filesetentry.clientPath AS clientPath)
            FROM Image image
            LEFT OUTER JOIN image.fileset fileset
            LEFT OUTER JOIN fileset.usedFiles filesetentry
            WHERE (index(filesetentry) = 0
                OR index(filesetentry) is null)
            AND image.id IN (:oids)
            """
    else:
        q = f"""
            SELECT new map(o.id AS id,
                o.name AS name,
                o.details.owner.id AS ownerId,
                o AS {itemType.lower()}_details_permissions)
            FROM {itemType} o
            WHERE o.id IN (:oids)
            """

    result_items = []

    for e in qs.projection(q, params, service_opts):
        e = unwrap(e)[0]
        e["permsCss"] = tree.parse_permissions_css(
            e[f"{itemType.lower()}_details_permissions"],
            e["ownerId"], conn)
        del e[f"{itemType.lower()}_details_permissions"]
        e["tags"] = tags_on_items.get(e["id"]) or []
        if itemType != "Image" or e["filesetId"] is None:
            # Ensure filesetId and clientPath are always present for
            # consistency, including images without filesets
            e["filesetId"] = "-1"
            e["clientPath"] = ""
        result_items.append(e)

    # Get the users from this group for reference
    users = tree.marshal_experimenters(conn, group_id=group_id, page=None)

    # Check if the owner of the tags are members of the current group
    # If not, add "Missing User" entries for them
    tags_owner_id_set = {t["ownerId"] for t in tags}
    owner_id_set = {u["id"] for u in users}
    for missing_owner in (tags_owner_id_set - owner_id_set):
        users.append(
            {
                "id": missing_owner,
                "omeName": "<hidden>",
                "firstName": "<hidden>",
                "lastName": "<hidden>"
            }
        )

    return JsonResponse({"tags": tags, "items": result_items, "users": users})
