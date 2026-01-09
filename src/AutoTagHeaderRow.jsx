import React from 'react';

import AutoTagHeaderRowTokenCell from './AutoTagHeaderRowTokenCell';
import AutoTagHeaderRowTagCell from './AutoTagHeaderRowTagCell';

export default class AutoTagHeaderRow extends React.Component {
  render() {
    let cellNodesToken = [...this.props.tokenMap].map(kv => {
      let token = kv[1];
      let tag = token.activeTag;

      // Hide the unmapped columns if set
      if (this.props.showUnmapped || token.possible.size > 0) {
        return (
          <AutoTagHeaderRowTokenCell token={token}
                                     tag={tag}
                                     tokenMap={this.props.tokenMap}
                                     selectMapping={this.props.selectMapping}
                                     newMapping={this.props.newMapping}
                                     items={this.props.items}
                                     handleCheckedChangeAll={this.props.handleCheckedChangeAll}
                                     key={token.value} />
        )
      }

    });

    let cellNodesTag = [...this.props.unmappedTags].map(tag =>
      <AutoTagHeaderRowTagCell tag={tag}
                               items={this.props.items}
                               handleCheckedChangeAll={this.props.handleCheckedChangeAll}
                               key={tag.id} />
    );

    // Get the sort arrow for the item name column
    let sortArrow = '';
    if (this.props.sortColumn === 'name') {
      sortArrow = this.props.sortDirection === 'asc' ? ' ▲' : ' ▼';
    }

    return (
      <thead className="sticky-header">
        <tr>
          {cellNodesToken}
          {cellNodesTag}
          <th style={{ cursor: 'pointer', userSelect: 'none' }}
              onClick={() => this.props.onSort('name')}>
            {this.props.itemType==="image"?<div><span>Original Import Path</span><br/><span>Item Name</span></div>:"Item Name"}
            {sortArrow}
          </th>
        </tr>
      </thead>
    );
  }
}
