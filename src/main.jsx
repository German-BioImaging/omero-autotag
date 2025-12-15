import React from 'react';
import ReactDOM from 'react-dom';
import AutoTagForm from './AutoTagForm';

function autotagform(itemIds, url, urlUpdate, urlCreateTag) {
  ReactDOM.render(
    <AutoTagForm url={url}
                 urlUpdate={urlUpdate}
                 urlCreateTag={urlCreateTag}
                 itemIds={itemIds} />,
    document.getElementById('auto_tag_panel')
  );
}

export default autotagform;
