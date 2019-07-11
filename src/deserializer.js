import { parse } from '@bbob/parser'
import typeOf from 'type-of'

/**
 * BBCode deserializer.
 *
 * @type {BBCode}
 */
class Deserializer {
  /**
   * Create a new deserializer with `rules`.
   *
   * @param {Object} options
   *   @property {Array} rules
   *   @property {String|Object|Block} defaultBlock
   *   @property {Function} parseHtml
   */

  constructor(rules, allowedTags) {
    this.rules = rules
    this.allowedTags = allowedTags
  }


  deserialize = (value, options) => {
    // create the AST from the bbcode
    let res = parse(value, {
      onlyAllowTags: this.allowedTags,
      enableEscapeTags: true
    })

    // first, do a bit of cleanup by merging all neighbouring text nodes together
    this.mergeText(res)

    // convert the bbcode AST to the slatejs syntax tree
    let nodes = this.deserializeElements(res)

    // remove all top-level non-block nodes, if requested to (which is the default)
    const {type} = options
    if (type === 'block') {
      nodes = nodes.filter(node => node.object === 'block')
    } else {
      nodes = nodes.filter(node => node.object !== 'block')
    }

    // plop it into a slate document object, and return
    let tree = {
      "object": "value",
      "document": {
        "object": "document",
        "data": {

        },
        "nodes": nodes
      }
    }
    return tree
  }


  mergeText = tree => {
    let i = 0
    while (true) {
      if (i >= tree.length) {
        break
      }

      if (typeof tree[i] === 'string' && typeof tree[i+1] === 'string') {
        tree[i] += tree[i+1]
        tree.splice(i+1, 1)
        continue
      }

      if (tree[i].content) {
        this.mergeText(tree[i].content)
      }

      i++
    }
  }


  deserializeElements = (elements = []) => {
    let nodes = []

    elements.forEach(element => {
      const node = this.deserializeElement(element)

      switch (typeOf(node)) {
        case 'array':
          nodes = nodes.concat(node)
          break
        case 'object':
          nodes.push(node)
          break
      }
    })

    return nodes
  }


  deserializeElement = element => {
    let node

    const next = elements => {
      switch (typeOf(elements)) {
        case 'array':
          return this.deserializeElements(elements)
        case 'object':
          return this.deserializeElement(elements)
        case 'null':
        case 'undefined':
          return
        default:
          throw new Error(
            `The \`next\` argument was called with invalid children: "${elements}".`
          )
      }
    }

    for (const rule of this.rules) {
      if (!rule.deserialize) continue
      const ret = rule.deserialize(element, next)
      const type = typeOf(ret)

      if (
        type !== 'array' &&
        type !== 'object' &&
        type !== 'null' &&
        type !== 'undefined'
      ) {
        throw new Error(
          `A rule returned an invalid deserialized representation: "${node}".`
        )
      }

      if (ret === undefined) {
        continue
      } else if (ret === null) {
        return null
      } else if (ret.object === 'mark') {
        node = this.deserializeMark(ret)
      } else {
        node = ret
      }

      if (node.object === 'block' || node.object === 'inline') {
        node.data = node.data || {}
        node.nodes = node.nodes || []
      } else if (node.object === 'text') {
        node.marks = node.marks || []
        node.text = node.text || ''
      }

      break
    }

    // didn't find a rule for this tag, deserialize it literally
    if (node === undefined) {
      console.warn(`No deserializer found for "${element.tag}". Deserializing literally`)
      node = [{object: 'text', text: `[${element.tag}]`, data: {}}]
      const ret = next(element.content)
      switch (typeOf(ret)) {
        case 'array':
          node = node.concat(ret)
          break
        case 'object':
          node.push(ret)
          break
      }
      node.push({object: 'text', text: `[/${element.tag}]`, data: {}})
    }

    return node || next(element.content)
  }


  deserializeMark = mark => {
    const { type, data } = mark

    const applyMark = node => {
      if (node.object === 'mark') {
        const ret = this.deserializeMark(node)
        return ret
      } else if (node.object === 'text') {
        node.marks = node.marks || []
        node.marks.push({ type, data, object: 'mark' })
      } else if (node.nodes) {
        node.nodes = node.nodes.map(applyMark)
      }

      return node
    }

    return mark.nodes.reduce((nodes, node) => {
      const ret = applyMark(node)
      if (Array.isArray(ret)) return nodes.concat(ret)
      nodes.push(ret)
      return nodes
    }, [])
  }
}

export default Deserializer
