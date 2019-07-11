import Serializer from './serializer'
import Deserializer from './deserializer'


const DEFAULT_RULES = {
  // string/text
  serialize(obj, children) {
    if (obj.object !== 'string') return
    // need to escape some characters

    // escape backslashes (because we are adding them)
    children = children.replace(/([\\])/gi, "\\$1")

    // escape any literal square brackets
    children = children.replace(/([[\]])/gi, "\\$1");

    return children
  },
  deserialize (node, next) {
    if (typeof node === 'string') return {object: 'text', text: node}
  }
}


/**
 * BBCode serializer/deserializer.
 *
 * @type {BBCode}
 */
class BBCode {
  /**
   * Create a new serializer with `rules`.
   *
   * @param {Object} options
   *   @property {Array} rules
   *   @property {String|Object|Block} defaultBlock
   *   @property {Function} parseHtml
   */

  constructor(rules, allowedTags) {
    this.rules = [DEFAULT_RULES, ...rules]

    this.serializer = new Serializer(this.rules)
    this.deserializer = new Deserializer(this.rules, allowedTags)
  }

  serialize = (value, options = {}) => {
    return this.serializer.serialize(value, options)
  }

  deserialize = (value, options = {type: 'block'}) => {
    return this.deserializer.deserialize(value, options)
  }
}

export default BBCode
