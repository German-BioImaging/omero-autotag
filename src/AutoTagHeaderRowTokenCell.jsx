import React from 'react';
import { Tooltip as ReactTooltip } from 'react-tooltip';
import Select from 'react-select';

export default class AutoTagHeaderRowTokenCell extends React.Component {

  constructor() {
    super();

    // Prebind this to callback methods
    this.handleCheckedChangeAll = this.handleCheckedChangeAll.bind(this);
    this.selectMapping = this.selectMapping.bind(this);
    this.formatTagLabel = this.formatTagLabel.bind(this);

    this.state = {
      menuOpen: false
    };
  }

  isChecked() {

    for (let item of this.props.items) {
      if (!item.checkedTokens.has(this.props.token)) {
        return false;
      }
    }
    return true;
  }

  isDisabled() {
    return this.props.tag === null;
  }

  handleCheckedChangeAll() {
    this.props.handleCheckedChangeAll(this.props.token, !this.isChecked());
  }

  formatTagLabel(tag) {
    if (tag !== undefined) {
      return "" + tag.value + "\u00a0" + "(" + tag.id + ")";
    }
    return '';
  }

  selectMapping(option) {
  if (!option) {
    this.props.selectMapping(this.props.token, null);
    return;
  }

  if (option.value.id === '__new__') {
    this.props.newMapping(this.props.token);
    return;
  }

  this.props.selectMapping(this.props.token, option.value);
}

  getTooltipId() {
    return 'tooltip-token-' + this.props.token.value;
  }

  render() {
    let token = this.props.token;
    let tag = this.props.tag;

    let options = [...token.possible].map(possibleTag =>
      {
        return (
          {
            value: possibleTag,
            label: this.formatTagLabel(possibleTag)
          }
        );
      }
    )

    options.push({
      value: { id: '__new__' },
      label: "New/Existing Tag"
    });

    let tagClassName = "tag_button";
    if (tag === null) {
      tagClassName += " tag_button_inactive";
    }

    return (
      <th>
        <div className={'token'}>{token.value}<br/>
          <input type="checkbox"
                 checked={this.isChecked()}
                 disabled={this.isDisabled()}
                 onChange={this.handleCheckedChangeAll} />
        </div>
        <div className={'tag'} >
          <Select
            name="tokenmapselect"
            onChange={this.selectMapping}
            options={options}
            value={options.find(o => o.value?.id === tag?.id)}
            getOptionLabel={(option) =>
              option.value.id === '__new__'
                ? 'New / Existing Tag'
                : this.formatTagLabel(option.value)
            }
            getOptionValue={(option) => option.value.id}
            isSearchable={false}
            isClearable={true}
            className={tagClassName}
            placeholder=" "
            classNamePrefix="react-select"
            styles={{
              option: (provided, state) => ({
                ...provided,
                // Check if this is the "New / Existing Tag" option
                color: state.data.value.id === '__new__' ? 'blue' : provided.color,
                fontWeight: state.data.value.id === '__new__' ? 'bold' : provided.fontWeight,
                borderStyle: state.data.value.id === '__new__' ? 'solid' : provided.borderStyle,
              })
            }}
          />
          {
            this.props.tag &&
            <ReactTooltip id={this.getTooltipId()} place="top" variant="dark" className={"autotag_tooltip"}>
              <ul>
                <li><strong>ID:</strong> {this.props.tag.id}</li>
                <li><strong>Value:</strong> {this.props.tag.value}</li>
                {
                  this.props.tag.description &&
                  <li><strong>Description:</strong> {this.props.tag.description}</li>
                }
                <li><strong>Owner:</strong> {this.props.tag.owner.omeName}</li>
              </ul>
            </ReactTooltip>
          }
        </div>
      </th>
    );
  }
}
