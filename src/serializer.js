import { Record } from 'immutable'

/**
 * String.
 *
 * @type {String}
 */
const String = new Record({
  object: 'string',
  text: '',
})

/**
 * BBCode serializer.
 *
 * @type {BBCode}
 */
class Serializer {
  /**
   * Create a new serializer with `rules`.
   *
   * @param {Object} options
   *   @property {Array} rules
   *   @property {String|Object|Block} defaultBlock
   *   @property {Function} parseHtml
   */

  constructor(rules) {
    this.rules = rules
  }


  /**
   * Serialize a `value` object into an HTML string.
   *
   * @param {Value} value
   * @param {Object} options
   *   @property {Boolean} render
   * @return {String|Array}
   */

  serialize = (value, options) => {
    const { document } = value
    const elements = document.nodes.map(this.serializeNode)

    const output = elements.join('\n').trim()
    return output
  }

  /**
   * Serialize a `node`.
   *
   * @param {Node} node
   * @return {String}
   */

  serializeNode = node => {
    if (node.object === 'text') {
      const string = new String({ text: node.text })
      const text = this.serializeString(string)

      return node.marks.reduce((children, mark) => {
        for (const rule of this.rules) {
          if (!rule.serialize) continue
          const ret = rule.serialize(mark, children)
          if (typeof ret !== 'undefined') return ret
        }

        throw new Error(`No serializer defined for mark type "${mark.type}".`)
      }, text)
    }

    const children = node.nodes.map(this.serializeNode).join('')

    for (const rule of this.rules) {
      if (!rule.serialize) continue
      const ret = rule.serialize(node, children)
      if (typeof ret !== 'undefined') return ret
    }

    throw new Error(`No serializer defined for node type "${node.type}".`)
  }

  /**
   * Serialize a `string`.
   *
   * @param {String} string
   * @return {String}
   */

  serializeString = string => {
    for (const rule of this.rules) {
      if (!rule.serialize) continue
      const ret = rule.serialize(string, string.text)
      if (typeof ret !== 'undefined') return ret
    }
  }
}

/**
 * Export.
 *
 * @type {Serializer}
 */

export default Serializer
