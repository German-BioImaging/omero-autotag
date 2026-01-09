import React from 'react';

export default class AutoTagItemRowTokenCell extends React.Component {

  constructor() {
    super();

    // Prebind this to callback methods
    this.handleCheckedChange = this.handleCheckedChange.bind(this);
  }

  // Only update an item row cell that has an updated item or new map for
  // this column
  shouldComponentUpdate(nextProps, nextState) {
    return (
      // The item was updated AND this token is now checked/unchecked
      // whereas before it was unchecked/checked
      (
        nextProps.item !== this.props.item &&
        nextProps.item.checkedTokens.has(nextProps.token) !== this.props.item.checkedTokens.has(this.props.token)
      ) ||
      // The mapping of this column changed
      nextProps.tag !== this.props.tag ||
      // The item was updated AND this tag is now applied/unapplied
      // whereas before it was unapplied/applied
      (
        nextProps.item !== this.props.item &&
        nextProps.item.tags.has(nextProps.tag) !== this.props.item.tags.has(this.props.tag)
      )
    );
  }

  isTagged() {
    if (this.props.tag !== null && this.props.item.tags.has(this.props.tag)) {
      return true;
    }
    return false;

  }

  isChecked() {
    return this.props.item.checkedTokens.has(this.props.token);
  }

  isDisabled() {
    // No tag mapping active
    if (this.props.tag === null) {
      return true;
    }

    // No permissions to annotate
    return !(this.props.tag.canAnnotate() && this.props.item.canAnnotate());

  }

  handleCheckedChange() {
    this.props.cellCheckedChange(this.props.item, this.props.token);
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
               disabled={this.isDisabled()}
               onChange={this.handleCheckedChange} />
      </td>
    );
  }
}
