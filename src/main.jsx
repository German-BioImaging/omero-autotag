import React from 'react';
import ReactDOM from 'react-dom';
import AutoTagForm from './AutoTagForm';

function autotagform(selectedObjects, childrenObjects, availableTypes, defaultType, url, urlUpdate, urlCreateTag) {
  ReactDOM.render(
    <AutoTagForm url={url}
                 urlUpdate={urlUpdate}
                 urlCreateTag={urlCreateTag}
                 selectedObjects={selectedObjects}
                 childrenObjects={childrenObjects}
                 availableTypes={availableTypes}
                 defaultType={defaultType} />,
  document.getElementById('auto_tag_panel')
  );
}
export default autotagform;
