import React from 'react';
import ReactDOM from 'react-dom';
import AutoTagForm from './AutoTagForm';

function autotagform(all_ids, dataType, url, urlIds, urlUpdate, urlCreateTag) {
  this.loadRequest = $.ajax({
    url: urlIds,
    type: "POST",
    data: {
      ids: all_ids,
      parentType: dataType
    },
    dataType: 'json',
    cache: false
  });

  this.loadRequest.done(res => {
    console.log(res);
    ReactDOM.render(
      <AutoTagForm url={url}
                   urlUpdate={urlUpdate}
                   urlCreateTag={urlCreateTag}
                   imageIds={res["image"]}
                   datasetIds={res["dataset"]}
                   dataType="image"/>,
      document.getElementById('auto_tag_panel')
    );
  });


}

export default autotagform;
