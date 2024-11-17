from __future__ import absolute_import
from builtins import map, str
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

    images = json.loads(request.POST.get("change"))

    dataType = request.POST.get("dataType").capitalize()

    additions = []
    removals = []

    for image in images:
        oid = image["imageId"]

        additions.extend(
            [(int(oid), int(addition),) for addition in image["additions"]]
        )

        removals.extend(
            [(int(oid), int(removal),) for removal in image["removals"]]
        )

    # TODO Interface for create_tag_annotations_links is a bit nasty, but go
    # along with it for now
    create_tag_annotations_links(conn, dataType, additions, removals)

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
def get_object_ids(request, conn=None, **kwargs):
    # According to REST, this should be a GET, but because of the amount of
    # data being submitted, this is problematic
    if not request.POST:
        return HttpResponseNotAllowed("Methods allowed: POST")

    obj_ids = request.POST.getlist("ids[]")
    parentType = request.POST.get("parentType")

    params = omero.sys.ParametersI()
    params.addLongs("pids", obj_ids)

    group_id = request.session.get("active_group")
    if group_id is None:
        group_id = conn.getEventContext().groupId
    service_opts = deepcopy(conn.SERVICE_OPTS)
    service_opts.setOmeroGroup(group_id)

    qs = conn.getQueryService()

    res = {}
    if parentType == "orphaned":
        res["image"] = []
    elif parentType == "tag":
        res["image"] = []
        res["dataset"] = []
        res["project"] = []
        res["screen"] = []
        res["plate"] = []
        res["run"] = []
        res["well"] = []
    elif parentType == "project":
        res["dataset"] = []
    elif parentType == "dataset":
        q = """
        SELECT i.id FROM Dataset d
        JOIN d.imageLinks il
        JOIN il.child i
        WHERE d.id IN (:pids)
        """
        res["image"] = []
        for e in qs.projection(q, params, service_opts):
            res["image"].append(unwrap(e[0]))

    elif parentType == "screen":
        res["plate"] = []
    elif parentType == "plate":
        res["image"] = []
        res["well"] = []
        res["run"] = []
    elif parentType == "acquisition":
        res["image"] = []

    return JsonResponse(res)


@login_required(setGroupContext=True)
def get_objects(request, conn=None, **kwargs):
    # According to REST, this should be a GET, but because of the amount of
    # data being submitted, this is problematic
    if not request.POST:
        return HttpResponseNotAllowed("Methods allowed: POST")

    obj_ids = request.POST.getlist("ids[]")
    dataType = request.POST.get("dataType").capitalize()

    if not obj_ids:
        return HttpResponseBadRequest("Image IDs required")

    obj_ids = list(map(int, obj_ids))

    group_id = request.session.get("active_group")
    if group_id is None:
        group_id = conn.getEventContext().groupId

    # All the tags available to the user
    tags = tree.marshal_tags(conn, group_id=group_id)

    # Details about the images specified
    params = omero.sys.ParametersI()
    service_opts = deepcopy(conn.SERVICE_OPTS)

    # Set the desired group context
    service_opts.setOmeroGroup(group_id)

    params.addLongs("oids", obj_ids)

    qs = conn.getQueryService()

    # Get the tags that are applied to individual images
    q = f"""
        SELECT DISTINCT itlink.parent.id, itlink.child.id
        FROM {dataType}AnnotationLink itlink
        WHERE itlink.child.class=TagAnnotation
        AND itlink.parent.id IN (:oids)
        """

    tags_on_images = defaultdict(list)
    for e in qs.projection(q, params, service_opts):
        tags_on_images[unwrap(e[0])].append(unwrap(e[1]))

    if dataType == "Image":
    # Get the images' details
        q = """
            SELECT new map(image.id AS id,
                image.name AS name,
                image.details.owner.id AS ownerId,
                image AS image_details_permissions,
                image.fileset.id AS filesetId,
                filesetentry.clientPath AS clientPath)
            FROM Image image
            JOIN image.fileset fileset
            JOIN fileset.usedFiles filesetentry
            WHERE index(filesetentry) = 0
            AND image.id IN (:oids)
            ORDER BY lower(image.name), image.id
            """
    else:
        q = f"""
            SELECT new map(o.id AS id,
                o.name AS name,
                o.details.owner.id AS ownerId,
                o AS {dataType.lower()}_details_permissions)
            FROM {dataType} o
            WHERE o.id IN (:oids)
            ORDER BY lower(o.name), o.id
            """

    result_obj = []

    for e in qs.projection(q, params, service_opts):
        e = unwrap(e)[0]
        e["permsCss"] = tree.parse_permissions_css(
            e[f"{dataType.lower()}_details_permissions"],
            e["ownerId"], conn)
        del e[f"{dataType.lower()}_details_permissions"]
        e["tags"] = tags_on_images.get(e["id"]) or []
        if dataType != "Image":
            e["filesetId"] = "-1"
            e["clientPath"] = ""
        result_obj.append(e)

    # Get the users from this group for reference
    users = tree.marshal_experimenters(conn, group_id=group_id, page=None)

    return JsonResponse({"tags": tags, "images": result_obj, "users": users})
