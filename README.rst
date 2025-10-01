.. image:: https://github.com/German-BioImaging/omero-autotag/workflows/PyPI/badge.svg
   :target: https://github.com/German-BioImaging/omero-autotag/actions

.. image:: https://badge.fury.io/py/omero-autotag.svg
    :target: https://badge.fury.io/py/omero-autotag


OMERO.autotag
=============

OMERO.autotag is a plugin for `OMERO.web <https://github.com/ome/omero-web>`_ that automates the application of tags to images based on the
original filename, path, and extensions of the images.

This was formerly part of `OMERO.webtagging <https://github.com/German-BioImaging/webtagging>`_, the umbrella name for tools developed to enhance use of text annotations (tags) in OMERO.

Requirements
============

As Python 2 has now reached end-of-life, OMERO 5.6 now
requires Python 3. With release 3.1.0 of autotag, the following are now required. To use autotag on older OMERO systems (running Python 2),
please use versions older than 3.1.0.

* Python 3.8 or later
* omero-web 5.6 or later
* django 4.2 or later

User Documentation
==================

http://help.openmicroscopy.org/web-tagging.html

Installation
============

The recommended way to install autotag is using `pip`, but it is also possible
to install it manually as described `here <https://www.openmicroscopy.org/site/support/omero5/developers/Web/CreateApp.html#add-your-app-location-to-your-pythonpath>`_.

::

  # In the python environment of OMERO.web (virtualenv or global)
  pip install omero-autotag

  # Add autotag to webclient
  omero config append omero.web.apps '"omero_autotag"'

  # Add autotag to centre panel
  omero config append omero.web.ui.center_plugins '["Auto Tag", "omero_autotag/auto_tag_init.js.html", "auto_tag_panel"]'

Upgrade from omero-webtagging-autotag to omero-autotag
======================================================

Since 3.2.2, the package was renamed to `omero-autotag`. This is a breaking change for OMERO.web, as the old package must be removed from the OMERO.web config and replaced by the new package.

You can perform the upgrade as follow:

::

  # stop omero web
  # Install the new package and uninstall the old one
  pip uninstall omero-webtagging-autotag
  pip install omero-autotag
  
  # Then open the OMERO.web configuration editor
  omero config edit
  # Update the two configurations called 'omero.web.apps' and 'omero.web.ui.center_plugins'
  # In 'omero.web.apps': 'omero_webtagging_autotag' -> 'omero_autotag'
  # In 'omero.web.ui.center_plugins': '["Auto Tag", "omero_webtagging_autotag/auto_tag_init.js.html", "auto_tag_panel"]' -> '["Auto Tag", "omero_autotag/auto_tag_init.js.html", "auto_tag_panel"]'
  # start omero web

Note that installing the latest `omero-webtagging-autotag` is not functional but has a dependency on `omero-autotag`. 
Thus, if you wish to use the old version `omero-webtagging-autotag`, make sure to specify the latest working version:

::

  # ONLY IF YOU WANT TO USE AN OLDER VERSION OF THE PLUGIN
  # stop omero web
  pip install omero-webtagging-autotag==3.2.0
  # And set the configuration accordingly
  # start omero web


Documentation
=============

Available on the `OMERO website <http://help.openmicroscopy.org/web-tagging.html>`_.


Development
===========

Uses node and webpack.

This will detect changes and rebuild `static/autotag/js/bundle.js` when there
are any. This works in conjunction with django development server as that
will be monitoring `bundle.js` for any changes.

To build the node components on changes

::

  cd omero_webtagging_autotag
  npm install
  node_modules/webpack/bin/webpack.js --watch

To install using pip in development mode (in appropriate virtualenv)

::

  # In the top-level autotag directory containing setup.py
  pip install -e .
  cd $OMERO_PREFIX

OMERO development server can then be started in the usual way. Remember to
configure the autotag settings the same as above.

Project Maintenance
===================

In 2014 as a part of the OME consortium, [Douglas Russell](http://github.com/dpwrussell) created
OMERO.webtagging and handed over
maintainence and development to
`German Bioimaging <https://gerbi-gmb.de/i3dbio/i3dbio-about/>`_ in September 2023.

Acknowledgements
================

OMERO.webtagging was created by Douglas P. W. Russell
(dpwrussell@gmail.com) while at Oxford University and
Harvard Medical School, then later extended by DPWR
Consulting Ltd.

These plugins were developed originally with the
support of `Micron Advanced Bioimaging Unit <https://micronoxford.com/>`_
funded by the Wellcome Trust Strategic Award 091911,
and `Open Microscopy <https://www.openmicroscopy.org/>`_.

Continued development was supported by `The Laboratory
of Systems Pharmacology, Harvard Medical School <https://hits.harvard.edu/the-program/laboratory-of-systems-pharmacology/research-program/>`_ and
`Research Computing, Harvard Medical School <https://it.hms.harvard.edu/our-services/research-computing>`_.

Continued development was sponsored by
`Micron Advanced Bioimaging Unit <https://micronoxford.com/>`_
funded by the Wellcome Trust Strategic Award 107457.
