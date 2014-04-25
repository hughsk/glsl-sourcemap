var through = require('through')
var fs = require('fs')

module.exports = sourcemap
module.exports.extract = extract

function sourcemap() {
  var parent
  var filedefs = []
  var files = {}
  var fidx = 0

  return through(write, flush)

  function flush() {
    var content = new Buffer(
      JSON.stringify(filedefs)
    ).toString('base64')

    this.queue({
        mode: 14
      , token: {
          type: 'line-comment'
        , data: '//@sourceMap=' + content
      }
      , children: []
      , type: 'line-comment'
      , parent: parent
    })

    this.queue(null)
  }

  function write(data) {
    if (!data.token) return this.queue(data)
    if (data.token.type === '(program)') return this.queue(parent = data)
    if (!('line' in data.token)) return this.queue(data)

    var line = data.token.line
    var file = data.token.file
    var hasFile = file in files

    // Add the file and its contents to the sourcemap
    if (file && !hasFile) {
      files[file] = files[file] || ++fidx
      hasFile = true

      filedefs.push({
          file: file
        , data: fs.readFileSync(file, 'utf8')
        , id: files[file]
      })
    }

    line = hasFile
      ? '#line ' + line + ' ' + files[file]
      : '#line ' + line

    this.queue({
        mode: 14
      , token: {
          type: 'preprocessor'
        , data: line
      }
      , children: []
      , type: 'preprocessor'
      , parent: data.parent
    })

    this.queue(data)
  }
}

function extract(str) {
  str = String(str)
  str = str.match(/\/\/@sourceMap=(.+)/)
  str = str && str[1]
  if (!str) return
  str = new Buffer(str, 'base64').toString()
  return JSON.parse(str)
}
