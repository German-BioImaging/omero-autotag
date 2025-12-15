import React from 'react';

export default class AutoTagItemRowTagCell extends React.Component {

  constructor() {
    super();

    // Prebind this to callback methods
    this.handleCheckedChange = this.handleCheckedChange.bind(this);
  }

  shouldComponentUpdate(nextProps, nextState) {
    return (
      // The item was updated AND this tag is now checked/unchecked
      // whereas before it was unchecked/checked
      (
        nextProps.item !== this.props.item &&
        nextProps.item.checkedTags.has(nextProps.tag) !== this.props.item.checkedTags.has(this.props.tag)
      ) ||
      // The item was updated AND this tag is now applied/unapplied
      // whereas before it was unapplied/applied
      (
        nextProps.item !== this.props.item &&
        nextProps.item.tags.has(nextProps.tag) !== this.props.item.tags.has(this.props.tag)
      )
    );
  }

  isTagged() {
    return this.props.item.tags.has(this.props.tag);
  }

  isChecked() {
    return this.props.item.checkedTags.has(this.props.tag);
  }

  isDisabled() {
    // No permissions to annotate
    return !(this.props.tag.canAnnotate() && this.props.item.canAnnotate());
  }

  handleCheckedChange() {
    this.props.cellCheckedChange(this.props.item, this.props.tag);
  }

  render() {
    let className = '';
    if (this.isTagged()) {
      className = 'success';
    }

    return (
      <td className={className}>
        <input type="checkbox"
               checked={this.isChecked()}
               onChange={this.handleCheckedChange} />
      </td>
    );
  }
}
