import React from 'react';
import ReactDOM from 'react-dom';
import Range from 'react-range';
import 'react-select/dist/react-select.css';
import './webtagging.css';

import Token from './Token';
import Image from './Image';
import Tag from './Tag';
import User from './User';
import {union, intersection, difference} from './SetUtils';

import AutoTagToolbar from './AutoTagToolbar';
import AutoTagTable from './AutoTagTable';
import TagSelectModal from './TagSelectModal';

export default class AutoTagForm extends React.Component {

  constructor() {
    super();

    this.state = {
      items: new Set(),
      users: new Map(),
      tags: new Map(),
      tokenMap: new Map(),
      unmappedTags: new Set(),
      showUnmapped: false,
      requiredTokenCardinality: 2,
      maxTokenCardinality: 2,
      separators: " _./\\[]",
      tagValuesMap: new Map()
    }

    // Abort capable AJAX variables
    this.loadRequest = undefined;

    // Prebind this to callback methods
    this.onSubmit = this.onSubmit.bind(this);
    this.cellCheckedChange = this.cellCheckedChange.bind(this);
    this.handleCheckedChangeAll = this.handleCheckedChangeAll.bind(this);
    this.selectMapping = this.selectMapping.bind(this);
    this.newMapping = this.newMapping.bind(this);
    this.addMapping = this.addMapping.bind(this);
    this.refreshForm = this.refreshForm.bind(this);
    this.toggleUnmapped = this.toggleUnmapped.bind(this);
    this.handleChangeRequiredTokenCardinality = this.handleChangeRequiredTokenCardinality.bind(this);
    this.handleChangeSeparator = this.handleChangeSeparator.bind(this);

  }

  setEmptyState() {
    this.setState({
      items: new Set(),
      users: new Map(),
      tags: new Map(),
      tokenMap: new Map(),
      unmappedTags: new Set(),
      requiredTokenCardinality: 2,
      maxTokenCardinality: 2,
    });
  }

  tokenValueCheck (tokenValue) {
    // Reject empty tokens
    return tokenValue.length > 0
  }

  addOrUpdateToken(tagValuesMap, tokenMap, value) {

    let token;

    // TODO Do filtering here

    // If the token is already in the map, just update that entry
    if (tokenMap.has(value)) {
      token = tokenMap.get(value);
      token.increment();

    // Otherwise, create the entry and do any token -> tag matching
    } else {
      token = new Token(value);
      tokenMap.set(value, token);

      // When a token is first added, attempt to match it to tags
      if (tagValuesMap.has(value)) {
        let tags = tagValuesMap.get(value);

        // Set the possible list to all the tags found (at least 1)
        token.possible = new Set(tags);

        // If there is just the one possible mapping, mark it active
        if (tags.size === 1) {
          token.setActive(tags.values().next().value);
        }
      }

    }

    return token;

  }

  tokensInName(item, tagValuesMap, tokenMap) {

    // escape special characters
    const escapedString = this.state.separators.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regexPattern = RegExp(`[${escapedString}]+`);


    const allTokens = new Set();
    // Split and add tokens from item.clientPath (for images)
    item.clientPath.split(regexPattern).forEach(value => allTokens.add(value));
    // Split and add tokens from item.name
    item.name.split(regexPattern).forEach(value => allTokens.add(value));

    // Process each unique token
    let itemTokens = new Set();
    allTokens.forEach(value =>
      itemTokens.add(this.addOrUpdateToken(tagValuesMap, tokenMap, value))
    );

    // Return the set of tokens that are present on this item
    return itemTokens;
  }

  loadFromServer(itemIds, itemType) {

    // If there is a request in progress, abort it in favour of this one
    if (this.loadRequest && this.loadRequest.readyState !== 4) {
      this.loadRequest.abort();
    }

    // If there is nothing to display, just reset to default state
    if (itemIds.length === 0) {
      this.setEmptyState();
      // And bail
      return;
    }

    this.loadRequest = $.ajax({
      url: this.props.url,
      type: "POST",
      data: {
        ids: itemIds,
        itemType: itemType
      },
      dataType: 'json',
      cache: false
    });

    this.loadRequest.done(jsonData => {

        // All users map, id -> User
        let users = new Map();

        // All tags map, id -> Tag
        let tags = new Map();

        // Tag values map, value -> [ids]
        let tagValuesMap = new Map();

        // Process users
        jsonData.users.forEach(jsonUser => {
          let user = new User(
            jsonUser.id,
            jsonUser.omeName,
            jsonUser.firstName,
            jsonUser.lastName,
            jsonUser.email
          );
          users.set(user.id, user);
        });

        // Process tags
        jsonData.tags.forEach(jsonTag => {

          // Resolve the owner ID to a user
          let tagOwner = users.get(jsonTag.ownerId);

          // Add the mapping from id to Tag
          let tag = new Tag(
            jsonTag.id,
            jsonTag.value,
            jsonTag.description,
            tagOwner,
            jsonTag.permsCss,
            jsonTag.set
          );
          tags.set(tag.id, tag);

          // Create an entry if necessary and add this tag as a potential
          // match for the tag's value
          if (!tagValuesMap.has(tag.value)) {
            tagValuesMap.set(tag.value, new Set([tag]));
          } else {
            tagValuesMap.get(tag.value).add(tag);
          }

        });

        // Generate the items
        let items = new Set();
        jsonData.items.forEach(jsonItem => {
          // Resolve the owner ID to a user
          let itemOwner = users.get(jsonItem.ownerId);
          // Get the tags that correspond to these tagIds
          let itemTags = new Set(
            jsonItem.tags.map(
              jsonTagId => tags.get(jsonTagId)
            )
          );
          // Add the item to the set //TODO Rename when generic
          let item = new Image(
            jsonItem.id,
            jsonItem.name,
            itemOwner,
            jsonItem.permsCss,
            jsonItem.clientPath,
            itemTags
          );
          items.add(item);
        });

        const res = this.initialize_tokens(items, tagValuesMap);
        items = res[0];
        let tokenMap = res[1];
        let unmappedTags = res[2];;

        // Set the state
        // Special case requiredTokenCardinality for when there is only one item
        this.setState({
          items: items,
          users: users,
          tags: tags,
          tokenMap: tokenMap,
          unmappedTags: unmappedTags,
          requiredTokenCardinality: items.size === 1 ? 1 : 2,
          maxTokenCardinality: items.size,
          tagValuesMap: tagValuesMap
        });

      }
    );
  }

  initialize_tokens(items, tagValuesMap) {
    // Separate initialize token function to refresh the tokens
    // each time separators are changed, without sending query to the server

    // Set of all tags which are used in at least one item, irrespective of
    // whether there is a token mapping using it or possible using it
    let allAppliedTags = new Set();

    // The possible mapping of tokens to tags
    // The active mapping
    // Counts of token use
    let tokenMap = new Map();

    // Process the items
    items.forEach(item => {
      // Find the tokens on each item, updating the tokenMap in place
      item.tokens = this.tokensInName(item, tagValuesMap, tokenMap);

      // Check any tokens that exist on this item by default
      item.checkedTokens = new Set(item.tokens);

      // Add any tags found on this item to this definitive set of used tags
      allAppliedTags = union(allAppliedTags, item.tags);
    });

    // Process the items again now that the token->tag map is complete as
    // the item may have tags applied for token->tag mappings where it
    // does not have the token. These should also be marked as checked
    // automatically

    // Get the reverse mapping of the tags to tokens. This is only possible
    // because there should be a 1:1 mapping between tokens and tags
    let activeTagTokenMap = new Map([...tokenMap].filter(
      kv => kv[1].isActive()
    ).map(
      kv => [kv[1].activeTag, kv[1]]
    ));

    // Also get the activeTagTokenMap as a Set for set operations
    let activeTagSet = new Set(activeTagTokenMap.keys());

    // Find the tags which are mapped in some way
    let mappedTags = new Set();
    tokenMap.forEach(token => {
      mappedTags = union(mappedTags, token.possible);
    });

    // Find the tags that are not applied in any way
    let unmappedTags = difference(allAppliedTags, mappedTags);


    // Check tokens due to applied tags for auto-mappings and
    // Check tags due to applied tags where there are no mappings
    items.forEach(item => {

      // Get the set of tags on this item that are currently mapped
      let appliedItemTags = intersection(activeTagSet, item.tags);

      // Lookup the tokens which those tags are mapped to and mark them
      // as checked
      appliedItemTags.forEach(tag => {
        let token = activeTagTokenMap.get(tag);
        item.checkToken(token);
      });

      // Get the set of tags that are on the item, but not involved in
      // any mapping. Apply this to checkedTags
      item.checkedTags = intersection(item.tags, unmappedTags);

    });
    return [items, tokenMap, unmappedTags];
  }

  componentDidMount() {
    this.loadFromServer(this.props.itemIds, this.props.itemType);
  }

  componentWillReceiveProps(nextProps) {

    // If the sizes are not the same we should definitely reload
    // If the itemType has changed, reload regardless of itemIds
    if (nextProps.itemIds.size !== this.props.itemIds.size || nextProps.itemType !== this.props.itemType) {
      this.loadFromServer(nextProps.itemIds, nextProps.itemType);
      // Bail out as a reload was required and done
      return;
    }

    // If the sets are the same size, then compare the values.
    if (
      difference(new Set(nextProps.itemIds), new Set(this.props.itemIds)).size > 0 ||
      difference(new Set(this.props.itemIds), new Set(nextProps.itemIds)).size > 0
    ) {
      this.loadFromServer(nextProps.itemIds, nextProps.itemType);
      // Bail out as a reload was required and done
      return;
    }

  }

  onSubmit(e) {
    e.preventDefault()

    // Get the active token -> tag mappings only
    let tokenMapActive = new Map([...this.state.tokenMap].filter(
      kv => kv[1].isActive()
    ));

    // Examine each item for changes
    let changes = [];
    let newItems = new Set();
    this.state.items.forEach(item => {
      let additions = [];
      let removals = [];

      // For each mapped token in the tokenTagMap compare its checked status
      // to the tagged status
      tokenMapActive.forEach(token => {
        let tag = token.activeTag;

        // Check if the user has permission to annotate this tag to this item
        if (tag.canAnnotate() && item.canAnnotate()) {

          // Get the checked and tagged states
          let checked = item.checkedTokens.has(token);
          let tagged = item.tags.has(tag);

          // Only add/remove if there has been a change
          // Assume success and thus update the item
          if (checked !== tagged) {
            // Addition
            if (checked) {
              additions.push(tag);
            // Removal
            } else {
              removals.push(tag);
            }
          }
        }

      });

      // For each of the unmapedTags compare its checked status to its tagged
      // status
      this.state.unmappedTags.forEach(tag => {

        // Get the checked and tagged states
        let checked = item.checkedTags.has(tag);
        let tagged = item.tags.has(tag);

        // Check if the user has permission to annotate this tag to this item
        if (tag.canAnnotate() && item.canAnnotate()) {

          // Only add/remove if there has been a change
          // Assume success and thus update the item
          if (checked !== tagged) {
            // Addition
            if (checked) {
              additions.push(tag);
            // Removal
            } else {
              removals.push(tag);
            }
          }
        }
      });

      // Add this item additions and removals to the payload
      if (additions.length > 0 || removals.length > 0) {
        changes.push({
          'itemId': item.id,
          'additions': additions.map(tag => tag.id),
          'removals': removals.map(tag => tag.id)
        });

        // If there were updates, then assume success, dirty the item and the
        // applied tags and add/remove the additions/removals
        let newItem = item.clone();
        newItem.tags = new Set(newItem.tags);
        newItem.tags = union(newItem.tags, additions);
        newItem.tags = difference(newItem.tags, new Set(removals));
        newItems.add(newItem);
      } else {
        newItems.add(item);
      }

    });

    // If there are no changes, no persistence is required
    if (changes.length === 0) {
      return;
    }

    this.setState({
      items: newItems
    });

    $.ajax({
      url: this.props.urlUpdate,
      type: "POST",
      data: {
        change: JSON.stringify(changes),
        itemType: this.props.itemType
      },
      success: function(data) {
        // No action required
      }.bind(this),
      error: function(xhr, status, err) {
        console.error(this.props.url, status, err.toString());

        // TODO Pop up a warning dialog

        // Completely reload as the state could have been partially updated
        // or failed for complex reasons due to updates outside of the scope
        // of autotag
        this.refreshForm();

      }.bind(this)
    });

  }

  cellCheckedChange(item, tokenOrTag) {
    // Add/remove the token or tag depending on if it is current present

    // Dirty the item and checkedTokens/checkedTags
    let newItem = item.clone();

    if (tokenOrTag instanceof Token) {
      newItem.checkedTokens = new Set(item.checkedTokens);
      newItem.checkedTokens.has(tokenOrTag) ? newItem.checkedTokens.delete(tokenOrTag): newItem.checkedTokens.add(tokenOrTag);
    } else if (tokenOrTag instanceof Tag) {
      newItem.checkedTags = new Set(item.checkedTags);
      newItem.checkedTags.has(tokenOrTag) ? newItem.checkedTags.delete(tokenOrTag): newItem.checkedTags.add(tokenOrTag);
    }

    this.state.items.delete(item);
    this.state.items.add(newItem);

    // And update state
    this.setState({
      items: this.state.items
    });

  }

  handleCheckedChangeAll(tokenOrTag, selectAll) {
    // Add/remove the token or tag to all items depending on if it is current present

    // Create mix of dirty and original items
    let newItems;
    if (tokenOrTag instanceof Token) {
      newItems = new Set([...this.state.items].map(item => {

        // If the item is not already correctly checked
        if (selectAll !== item.checkedTokens.has(tokenOrTag)) {
          // Mark item and checkedTokens dirty
          let newItem = item.clone();
          newItem.checkedTokens = new Set(item.checkedTokens);
          selectAll ? newItem.checkedTokens.add(tokenOrTag): newItem.checkedTokens.delete(tokenOrTag);
          return newItem;
        }
        // Otherwise, return the existing item
        return item;
      }));

    } else if (tokenOrTag instanceof Tag) {

      newItems = new Set([...this.state.items].map(item => {

        // If the item is not already correctly checked
        if (selectAll !== item.checkedTags.has(tokenOrTag)) {
          // Mark item and checkedTags dirty
          let newItem = item.clone();
          newItem.checkedTags = new Set(item.checkedTags);
          selectAll ? newItem.checkedTags.add(tokenOrTag): newItem.checkedTags.delete(tokenOrTag);
          return newItem;
        }
        // Otherwise, return the existing item
        return item;
      }));
    }

    // Update state
    this.setState({
      items: newItems
    });
  }

  selectMapping(token, tag) {

    // TODO Check if this tag is already assigned to some other column?

    // Recalculate the checked state of this column for each item row
    for (let item of this.state.items) {
      // Determine if the item should be checked for this mapping either
      // because it has the token or it has the tag applied
      let checked = item.tokens.has(token) || item.tags.has(tag);

      // Update the item if necessary
      if (checked !== item.checkedTokens.has(token)) {
        checked ? item.checkedTokens.add(token) : item.checkedTokens.delete(token);
      }
    }

    // Update the tokenMap
    token.setActive(tag);

    // Update state.
    // Mark tokenMap dirty
    this.setState({
      items: this.state.items,
      tokenMap: new Map(this.state.tokenMap)
    });

  }

  newMapping(token) {

    let $dialog = $('<div>').dialog({

      title: 'Choose Tag',
      resizable: false,
      height: 320,
      width:420,
      modal: true,


      close: function(e){
        ReactDOM.unmountComponentAtNode(this);
        $( this ).remove();
      }
    });

    let closeDialog = function(e){
      e.preventDefault();
      $dialog.dialog('close');
    }

    ReactDOM.render(
      <TagSelectModal closeDialog={closeDialog}
                      token={token}
                      tags={this.state.tags}
                      tokenMap={this.state.tokenMap}
                      addMapping={this.addMapping}
      />,
      $dialog[0]
    );
  }

  addMapping(token, tag, tagValue, tagDescription) {
    // Undefined tagValue means this is an existing tag
    if (tagValue === undefined && tag !== undefined){
      // Add the tag to the tokenMap for this token
      token.possible.add(tag);

      // Remove the tag from the unmapped Tags
      this.state.unmappedTags.delete(tag);

      this.setState({
        tokenMap: this.state.tokenMap,
        unmappedTags: this.state.unmappedTags
      });

      this.selectMapping(token, tag);

    // This is a new tag
    } else if (tagValue !== undefined){
      // Create the tag. In this case we can not update the form until the
      // ajax call is successful as the tag ID is not known until it returns
      // and that is important imformation
      $.ajax({
        url: this.props.urlCreateTag,
        type: "POST",
        data: JSON.stringify({
          value: tagValue,
          description: tagDescription
        }),
        dataType: 'json',
        success: function(jsonTag) {

          // Resolve the owner ID to a user
          let tagOwner = this.state.users.get(jsonTag.ownerId);

          // Add the mapping from id to Tag
          let tag = new Tag(
            jsonTag.id,
            jsonTag.value,
            jsonTag.description,
            tagOwner,
            jsonTag.permsCss,
            jsonTag.set
          );
          this.state.tags.set(tag.id, tag);

          // Add the tag to the tokenMap for this token
          token.possible.add(tag);

          this.setState({
            tokenMap: this.state.tokenMap,
            unmappedTags: this.state.unmappedTags,
            tags: this.state.tags
          });

          this.selectMapping(token, tag);

        }.bind(this),
        error: function(xhr, status, err) {
          console.error(this.props.url, status, err.toString());
        }.bind(this)
      });
    }
  }

  refreshForm() {
    this.loadFromServer(this.props.itemIds, this.props.itemType);
  }

  toggleUnmapped() {
    this.setState({
      showUnmapped: !this.state.showUnmapped
    });
  }

  handleChangeRequiredTokenCardinality(value) {
    this.setState({
      requiredTokenCardinality: value
    });
  }

  handleChangeSeparator(value) {
    // Do not use setState here yet (would already refresh the page)
    this.state.separators = value;

    let items = this.state.items;
    let tagValuesMap = this.state.tagValuesMap;
    tokenMap, unmappedTags;

    // Recompute the item tokens
    const res = this.initialize_tokens(items, tagValuesMap);
    items = res[0];
    let tokenMap = res[1];
    let unmappedTags = res[2];

    // Set the state
    // Special case requiredTokenCardinality for when there is only one item
    this.setState({
      items: items,
      tokenMap: tokenMap,
      unmappedTags: unmappedTags
    });

  }

  filteredTokenMap() {
    // Filter out any tokens that do not meet the requirements
    // Requirements for inclusion:
    // 1) Matches an existing tag value
    // 2) Is present on required number of items
    let tokenMap = new Map([...this.state.tokenMap].filter(kv => {
      let token = kv[1];
      return (

        token.possible.size > 0 ||
        (
          token.count >= this.state.requiredTokenCardinality &&
          this.tokenValueCheck(token.value)
        )
      )

    }));
    return tokenMap;
  }

  render() {
    return (
      <form ref="form" onSubmit={this.onSubmit} id="updateAllForm" className={'autotagForm'}>

        <AutoTagToolbar requiredTokenCardinality={this.state.requiredTokenCardinality}
                        maxTokenCardinality={this.state.maxTokenCardinality}
                        showUnmapped={this.state.showUnmapped}
                        handleChangeRequiredTokenCardinality={this.handleChangeRequiredTokenCardinality}
                        toggleUnmapped={this.toggleUnmapped}
                        refreshForm={this.refreshForm}
                        separators={this.state.separators}
                        handleChangeSeparator={this.handleChangeSeparator}
                        itemType={this.props.itemType}
        />

        <AutoTagTable tokenMap={this.filteredTokenMap()}
                      items={this.state.items}
                      itemType={this.props.itemType}
                      unmappedTags={this.state.unmappedTags}
                      showUnmapped={this.state.showUnmapped}
                      requiredTokenCardinality={this.state.requiredTokenCardinality}
                      cellCheckedChange={this.cellCheckedChange}
                      selectMapping={this.selectMapping}
                      newMapping={this.newMapping}
                      handleCheckedChangeAll={this.handleCheckedChangeAll}

        />
      </form>
    );
  }
}
