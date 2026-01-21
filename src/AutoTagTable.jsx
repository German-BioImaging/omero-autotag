import React from 'react';
import ReactDOM from 'react-dom';

import AutoTagHeaderRow from './AutoTagHeaderRow';
import AutoTagItemRow from './AutoTagItemRow';

export default class AutoTagForm extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      sortColumn: 'name',
      sortDirection: 'asc' // 'asc' or 'desc'
    };
    this.handleSort = this.handleSort.bind(this);
  }

  handleSort(column) {
    if (this.state.sortColumn === column) {
      // Toggle direction if clicking the same column
      this.setState({
        sortDirection: this.state.sortDirection === 'asc' ? 'desc' : 'asc'
      });
    } else {
      // Set new column and default to ascending
      this.setState({
        sortColumn: column,
        sortDirection: 'asc'
      });
    }
  }

  shouldComponentUpdate(nextProps, nextState) {
    // If it is a change in the required token cardinality (and unmapped tags are displayed)
    if (
        this.props.showUnmapped &&
        nextProps.requiredTokenCardinality != this.props.requiredTokenCardinality &&
        this.props.items === nextProps.items
    ) {
      // Ensure it would actually result in a change of number of tags displayed
      return nextProps.tokenMap.size !== this.props.tokenMap.size;
    }

    // Always update for anything else
    return true;
  }

  render() {

    // Sort the rows based on the current sort column and direction
    let rowNodes = [...this.props.items].sort((a, b) => {
      let compareValue = 0;

      if (this.state.sortColumn === 'name') {
        let caselessA = a.name.toLowerCase();
        let caselessB = b.name.toLowerCase();

        if (caselessA < caselessB) {
          compareValue = -1;
        } else if (caselessA > caselessB) {
          compareValue = 1;
        } else {
          // If names are equal, sort by ID
          if (a.id < b.id) {
            compareValue = -1;
          } else if (a.id > b.id) {
            compareValue = 1;
          }
        }
      } else if (this.state.sortColumn === 'id') {
        if (a.id < b.id) {
          compareValue = -1;
        } else if (a.id > b.id) {
          compareValue = 1;
        }
      }

      // Apply sort direction
      return this.state.sortDirection === 'asc' ? compareValue : -compareValue;
    }).map(item =>
        <AutoTagItemRow key={item.id}
                         item={item}
                         tokenMap={this.props.tokenMap}
                         unmappedTags={this.props.unmappedTags}
                         cellCheckedChange={this.props.cellCheckedChange}
                         showUnmapped={this.props.showUnmapped} />
    );

    let hasFileset = [...this.props.items].some(item => item.clientPath !== "");

    return (
      <div style={{position:'absolute',
                   bottom:'25px',
                   left:'0px',
                   top:'58px',
                   overflow:'auto',
                   marginTop:'0px',
                   right:'0px'}}>

        <table id="token-table"
               className={'table table-bordered table-striped table-hover table-condensed hidePathTokens hideExtTokens'}>
            <AutoTagHeaderRow tokenMap={this.props.tokenMap}
                              unmappedTags={this.props.unmappedTags}
                              selectMapping={this.props.selectMapping}
                              newMapping={this.props.newMapping}
                              items={this.props.items}
                              hasFileset={hasFileset}
                              handleCheckedChangeAll={this.props.handleCheckedChangeAll}
                              showUnmapped={this.props.showUnmapped}
                              sortColumn={this.state.sortColumn}
                              sortDirection={this.state.sortDirection}
                              onSort={this.handleSort} />

          <tbody>
            {rowNodes}
          </tbody>

        </table>
      </div>
    );
  }
}
