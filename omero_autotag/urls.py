from django.urls import re_path
from . import views

urlpatterns = [
    re_path(
        r"^get_object_ids/$",
        views.get_object_ids,
        name="autotag_get_object_ids",
    ),
    re_path(
        r"^get_objects/$",
        views.get_objects,
        name="autotag_get_objects",
    ),
    # process main form submission
    re_path(
        r"^auto_tag/processUpdate/$",
        views.process_update,
        name="autotag_process_update",
    ),
    # Create tags for tags dialog
    re_path(r"^create_tag/$", views.create_tag, name="autotag_create_tag"),
]
