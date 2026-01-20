import React from 'react';
import { Tooltip as ReactTooltip } from 'react-tooltip';

export default class AutoTagToolbar extends React.Component {

  constructor() {
    super();

    // Prebind this to callback methods
    this.refreshForm = this.refreshForm.bind(this);
    this.toggleUnmapped = this.toggleUnmapped.bind(this);
    this.handleChangeRequiredTokenCardinality = this.handleChangeRequiredTokenCardinality.bind(this);
    this.handleChangeSeparator = this.handleChangeSeparator.bind(this);

  }

  refreshForm(e) {
    e.preventDefault();
    this.props.refreshForm();
  }

  toggleUnmapped(e) {
    this.props.toggleUnmapped();
  }

  handleChangeRequiredTokenCardinality(e) {
    this.props.handleChangeRequiredTokenCardinality(e.target.value);
  }

  handleChangeSeparator(e) {
    this.props.handleChangeSeparator(e.target.value);
  }

  render() {
    return (
      <div
        style={{
          position: 'absolute',
          top: '5px',
          left: '0px',
          right: '0px',
          height: '58px',
          marginRight: '10px'
        }}
        className={'toolbar'}
      >
        <span
          data-tooltip-id={'tooltip-toolbar-obj-type'}
          style={{float: 'left', marginLeft: '10px', fontSize: '12px', fontWeight: 'bold', lineHeight: '29px'}}
        >
          {this.props.availableTypes && this.props.availableTypes.length > 1 ? (
            <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
              <label htmlFor="itemTypeSelect" style={{margin: '0'}}>
                Tagging
              </label>
              <select
                id="itemTypeSelect"
                value={this.props.selectedItemType || ''}
                onChange={this.props.handleChangeItemType}
                style={{padding: '4px', fontSize: '12px', cursor: 'pointer'}}
              >
                {this.props.availableTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            `Tagging ${this.props.itemType}s`
          )}
        </span>

        <ReactTooltip
            id={'tooltip-toolbar-obj-type'}
            place="bottom"
            variant="dark"
            offset={5}
            className={'autotag_toolbar_tooltip'} >
          {this.props.availableTypes && this.props.availableTypes.length > 1
            ? 'Select which object type to tag.'
            : 'The object type currently being tagged.'
          }
        </ReactTooltip>

        {
          this.props.showUnmapped &&
          <div style={{display: 'flex', alignItems: 'center', float: 'left', marginLeft: '20px', marginRight: '20px', lineHeight: '29px'}}>
            <span
              data-tooltip-id={'tooltip-toolbar-slider'}
              style={{
                fontSize: '12px',
                fontWeight: 'bold',
                marginRight: '10px'
              }}
            >Rarity Threshold&nbsp;&nbsp;{this.props.requiredTokenCardinality}</span>
            <input className='slider'
                   type='range'
                   onChange={this.handleChangeRequiredTokenCardinality}
                   value={this.props.requiredTokenCardinality}
                   min={1}
                   max={this.props.maxTokenCardinality}
                   style={{
                     cursor: 'pointer'
                   }} />
            {
              this.props.showUnmapped &&
              <ReactTooltip
                  id={'tooltip-toolbar-slider'}
                  place="bottom"
                  variant="dark"
                  offset={-4}
                  className={'autotag_toolbar_tooltip'} >
                Hide columns if token is found on fewer than this number of items.
              </ReactTooltip>
            }
          </div>
        }

        <span
          data-tooltip-id={'tooltip-toolbar-split-chars'}
          style={{fontSize: '12px', fontWeight: 'bold', lineHeight: '29px'}}
        >
          Split on&nbsp;
        </span>

        <ReactTooltip
            id={'tooltip-toolbar-split-chars'}
            place="bottom"
            variant="dark"
            offset={5}
            className={'autotag_toolbar_tooltip'} >
          Characters used to split the path and names to find relevant tags.
        </ReactTooltip>

        <input type="text"
               size="5"
               onChange={this.handleChangeSeparator}
               value={this.props.separators}
               style={{
                marginRight: '20px'
              }} />

        <span
          data-tooltip-id={'tooltip-toolbar-show-all'}
          style={{fontSize: '12px', fontWeight: 'bold', lineHeight: '29px', marginRight: '5px'}}
        >
          Show All Potential Tags
        </span>

        <ReactTooltip
            id={'tooltip-toolbar-show-all'}
            place="bottom"
            variant="dark"
            offset={5}
            className={'autotag_toolbar_tooltip'} >
          Show all the tokens found in the filenames that do not match an existing tag
        </ReactTooltip>

        <input type="checkbox"
               checked={this.props.showUnmapped}
               onChange={this.toggleUnmapped}
               style={{
                verticalAlign: 'middle',
                marginRight: '20px',
                cursor: 'pointer'
              }} />

        <input type="submit"
               id="applyButton"
               value="Apply" />

        <input type="button"
               onClick={this.refreshForm}
               id="refreshForm"
               value="Refresh" />

      </div>
    );
  }
}
