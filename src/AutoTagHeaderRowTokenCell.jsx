import React from 'react';
import { Tooltip as ReactTooltip } from 'react-tooltip';
// lightweight custom dropdown used instead of react-select

export default class AutoTagHeaderRowTokenCell extends React.Component {

  constructor() {
    super();

    // Prebind this to callback methods
    this.handleCheckedChangeAll = this.handleCheckedChangeAll.bind(this);
    this.selectMapping = this.selectMapping.bind(this);
    this.formatTagLabel = this.formatTagLabel.bind(this);
    this.selectGetOptionLabel = this.selectGetOptionLabel.bind(this);
    this.toggleMenu = this.toggleMenu.bind(this);
    this.handleDocumentClick = this.handleDocumentClick.bind(this);
    this.handleOptionSelect = this.handleOptionSelect.bind(this);

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
    if (option === null) {
      this.props.selectMapping(this.props.token, null);
    } else if (option.value !== undefined) {
      this.props.selectMapping(this.props.token, option.value);
    } else {
      this.props.newMapping(this.props.token)
    }
  }

  componentDidMount() {
    document.addEventListener('click', this.handleDocumentClick);
  }

  componentWillUnmount() {
    document.removeEventListener('click', this.handleDocumentClick);
  }

  toggleMenu(e) {
    e.stopPropagation();
    this.setState({menuOpen: !this.state.menuOpen});
  }

  handleDocumentClick() {
    if (this.state.menuOpen) {
      this.setState({menuOpen: false});
    }
  }

  handleOptionSelect(tag) {
    // tag === undefined means New/Existing
    if (tag === undefined) {
      this.props.newMapping(this.props.token);
    } else {
      this.props.selectMapping(this.props.token, tag);
    }
    this.setState({menuOpen: false});
  }

  getTooltipId() {
    return 'tooltip-token-' + this.props.token.value;
  }

  selectGetOptionLabel(option) {
    let label = this.formatTagLabel(option);

    return (
      <span data-tooltip-id={this.getTooltipId()}>{label}</span>
    )
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

    let newExisting = (
      <span style={{color: "blue", fontWeight: "bold", borderStyle: "solid"}}>New/Existing Tag</span>
    );

    options.push({
      value: undefined,
      label: newExisting
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
          <div className={'tag_dropdown'} style={{position: 'relative', display: 'inline-block'}}>
            <span className={tagClassName} onClick={this.toggleMenu} data-tooltip-id={tag ? this.getTooltipId() : undefined}>
              { tag ? ("" + tag.value + "\u00a0(" + tag.id + ")") : '\u00a0' }
              <span style={{marginLeft:3}}>▾</span>
            </span>
            { this.state.menuOpen &&
              <div className={'tag_dropdown_menu'} style={{position:'absolute', top:'100%', left:0, zIndex:1000, background:'#fff', border:'1px solid #ccc', padding:'4px'}}>
                {
                  options.map((opt, idx) => {
                    const optVal = opt.value; // possibleTag or undefined
                    const label = (optVal !== undefined) ? (optVal.value + "\u00a0(" + optVal.id + ")") : null;
                    return (
                      <div key={idx}
                           onClick={(e)=>{ e.stopPropagation(); this.handleOptionSelect(optVal); }}
                           style={{padding:'4px 8px', cursor:'pointer', whiteSpace:'nowrap'}}
                           data-tooltip-id={optVal ? this.getTooltipId() : undefined}>
                        { optVal ? label : opt.label }
                      </div>
                    );
                  })
                }
              </div>
            }
          </div>
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
