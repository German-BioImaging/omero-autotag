import React from 'react';
import AutoTagItemRowTokenCell from './AutoTagItemRowTokenCell';
import AutoTagItemRowTagCell from './AutoTagItemRowTagCell';

export default class AutoTagItemRow extends React.Component {

  // Only update an item row that has had a modified state
  shouldComponentUpdate(nextProps, nextState) {
    return (nextProps.showUnmapped !== this.props.showUnmapped ||
            nextProps.item !== this.props.item ||
            nextProps.tokenMap !== this.props.tokenMap);
  }

  render() {
    let item = this.props.item;
    let tokenMap = this.props.tokenMap;
    let unmappedTags = this.props.unmappedTags;
    let showUnmapped = this.props.showUnmapped;

    let cellNodesToken = [...tokenMap].map(kv => {
      let token = kv[1];
      let tag = token.activeTag;

      if (showUnmapped || token.possible.size > 0) {
        return (
          <AutoTagItemRowTokenCell key={token.value}
                                    item={item}
                                    token={token}
                                    tag={tag}
                                    cellCheckedChange={this.props.cellCheckedChange} />
        );
      }
    })

    let cellNodesTag = [...unmappedTags].map(tag =>
        <AutoTagItemRowTagCell key={tag.id}
                                item={item}
                                tag={tag}
                                cellCheckedChange={this.props.cellCheckedChange} />
    );

    return (
      <tr>
        {cellNodesToken}
        {cellNodesTag}
        <td style={{whiteSpace: 'nowrap'}}>{item.clientPath}<br/>{item.name}&nbsp;(id:{item.id})</td>
      </tr>
    );
  }
}
