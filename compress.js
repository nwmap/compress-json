

function memToValues(mem) {
  return mem.store.toArray()
}

let i_to_s = ""
for (let i = 0; i < 10; i++) {
  const c = String.fromCharCode(48 + i)
  i_to_s += c
}
for (let i = 0; i < 26; i++) {
  const c = String.fromCharCode(65 + i)
  i_to_s += c
}
for (let i = 0; i < 26; i++) {
  const c = String.fromCharCode(65 + 32 + i)
  i_to_s += c
}
const N = i_to_s.length
const s_to_i = {}
for (let i = 0; i < N; i++) {
  const s = i_to_s[i]
  s_to_i[s] = i
}

function int_to_s(int) {
  if (int === 0) {
    return i_to_s[0]
  }
  const acc = []
  while (int !== 0) {
    const i = int % N
    const c = i_to_s[i]
    acc.push(c)
    int -= i
    int /= N
  }
  return acc.reverse().join("")
}
function getValueKey(mem, value) {
  if (mem.cache.hasValue(value)) {
    return mem.cache.getValue(value)
  }
  const id = mem.keyCount++
  const key = num_to_s(id)
  mem.store.add(value)
  mem.cache.setValue(value, key)
  return key
}

let config = {
  sort_key: false
}
function getSchema(mem, keys) {
  if (config.sort_key) {
    keys.sort()
  }
  const schema = keys.join(",")
  if (mem.cache.hasSchema(schema)) {
    return mem.cache.getSchema(schema)
  }
  const key_id = addValue(mem, keys, undefined)
  mem.cache.setSchema(schema, key_id)
  return key_id
}

function addValue(mem, o, parent) {
  if (o === null) {
    return ""
  }
  switch (typeof o) {
    case "undefined":
      if (Array.isArray(parent)) {
        return addValue(mem, null, parent)
      }
      break
    case "object":
      if (o === null) {
        return getValueKey(mem, null)
      }
      if (Array.isArray(o)) {
        let acc = "a"
        for (let i = 0; i < o.length; i++) {
          const v = o[i]
          const key = v === null ? "_" : addValue(mem, v, o)
          acc += "|" + key
        }
        if (acc === "a") {
          acc = "a|"
        }
        return getValueKey(mem, acc)
      } else {
        const keys = Object.keys(o)
        if (keys.length === 0) {
          return getValueKey(mem, "o|")
        }
        let acc = "o"
        const key_id = getSchema(mem, keys)
        acc += "|" + key_id
        for (const key of keys) {
          const value = o[key]
          const v = addValue(mem, value, o)
          acc += "|" + v
        }
        return getValueKey(mem, acc)
      }
    case "boolean":
      return getValueKey(mem, encodeBool(o))
    case "number":
      return getValueKey(mem, encodeNum(o))
    case "string":
      return getValueKey(mem, encodeStr(o))
  }
  return throwUnknownDataType(o)
}
function makeInMemoryCache() {
  const valueMem = Object.create(null)
  const schemaMem = Object.create(null)
  return {
    getValue(key) {
      return valueMem[key]
    },
    getSchema(key) {
      return schemaMem[key]
    },
    forEachValue(cb) {
      for (const [key, value] of Object.entries(valueMem)) {
        if (cb(key, value) === "break") {
          return
        }
      }
    },
    forEachSchema(cb) {
      for (const [key, value] of Object.entries(schemaMem)) {
        if (cb(key, value) === "break") {
          return
        }
      }
    },
    setValue(key, value) {
      valueMem[key] = value
    },
    setSchema(key, value) {
      schemaMem[key] = value
    },
    hasValue(key) {
      return key in valueMem
    },
    hasSchema(key) {
      return key in schemaMem
    }
  }
}

function makeInMemoryStore() {
  const mem = []
  return {
    forEach(cb) {
      for (let i = 0; i < mem.length; i++) {
        if (cb(mem[i]) === "break") {
          return
        }
      }
    },
    add(value) {
      mem.push(value)
    },
    toArray() {
      return mem
    }
  }
}

function makeInMemoryMemory() {
  return {
    store: makeInMemoryStore(),
    cache: makeInMemoryCache(),
    keyCount: 0
  }
}

function s_to_num(s) {
  if (s[0] === "-") {
    return -s_to_num(s.substr(1))
  }
  let [a, b, c] = s.split(".")
  if (!b) {
    return s_to_int(a)
  }
  a = s_to_int_str(a)
  b = s_to_int_str(b)
  b = reverse(b)
  let str = a + "." + b
  if (c) {
    str += "e"
    let neg = false
    if (c[0] === "-") {
      neg = true
      c = c.slice(1)
    }
    c = s_to_int_str(c)
    c = reverse(c)
    str += neg ? -c : +c
  }
  return +str
}

function s_to_int_str(s) {
  if (s[0] === ":") {
    return s_to_big_int(s.substring(1)).toString()
  }
  return s_to_int(s).toString()
}

function num_to_s(num) {
  if (num < 0) {
    return "-" + num_to_s(-num)
  }
  let [a, b] = num.toString().split(".")
  if (!b) {
    return int_to_s(num)
  }
  let c
  if (b) {
    ;[b, c] = b.split("e")
  }
  a = int_str_to_s(a)
  b = reverse(b)
  b = int_str_to_s(b)
  let str = a + "." + b
  if (c) {
    str += "."
    switch (c[0]) {
      case "+":
        c = c.slice(1)
        break
      case "-":
        str += "-"
        c = c.slice(1)
        break
    }
    c = reverse(c)
    c = int_str_to_s(c)
    str += c
  }
  return str
}

function encodeNum(num) {
  const a = "n|" + num_to_s(num)
  return a
  // let b = num.toString()
  // return a.length < b.length ? a : num
}

function decodeNum(s) {
  s = s.replace("n|", "")
  return s_to_num(s)
}

function decodeKey(key) {
  return typeof key === "number" ? key : s_to_int(key)
}

function encodeBool(b) {
  // return 'b|' + bool_to_s(b)
  return b ? "b|T" : "b|F"
}

function decodeBool(s) {
  switch (s) {
    case "b|T":
      return true
    case "b|F":
      return false
  }
  return !!s
}

function encodeStr(str) {
  const prefix = str[0] + str[1]
  switch (prefix) {
    case "b|":
    case "o|":
    case "n|":
    case "a|":
    case "s|":
      str = "s|" + str
  }
  return str
}

function decodeStr(s) {
  const prefix = s[0] + s[1]
  return prefix === "s|" ? s.substr(2) : s
}

 function compress(o) {
  const mem = makeInMemoryMemory()
  const root = addValue(mem, o, undefined)
  const values = memToValues(mem)
  return [values, root]
}

function decodeObject(values, s) {
  if (s === "o|") {
    return {}
  }
  const o = {}
  const vs = s.split("|")
  const key_id = vs[1]
  let keys = decode(values, key_id)
  const n = vs.length
  if (n - 2 === 1 && !Array.isArray(keys)) {
    // single-key object using existing value as key
    keys = [keys]
  }
  for (let i = 2; i < n; i++) {
    const k = keys[i - 2]
    let v = vs[i]
    v = decode(values, v)
    o[k] = v
  }
  return o
}

function throwUnknownDataType(o) {
  throw new TypeError("unsupported data type: " + getType(o))
}

function decodeArray(values, s) {
  if (s === "a|") {
    return []
  }
  const vs = s.split("|")
  const n = vs.length - 1
  const xs = new Array(n)
  for (let i = 0; i < n; i++) {
    let v = vs[i + 1]
    v = decode(values, v)
    xs[i] = v
  }
  return xs
}

 function decode(values, key) {
  if (key === "" || key === "_") {
    return null
  }
  const id = decodeKey(key)
  const v = values[id]
  if (v === null) {
    return v
  }
  switch (typeof v) {
    case "undefined":
      return v
    case "number":
      return v
    case "string":
      const prefix = v[0] + v[1]
      switch (prefix) {
        case "b|":
          return decodeBool(v)
        case "o|":
          return decodeObject(values, v)
        case "n|":
          return decodeNum(v)
        case "a|":
          return decodeArray(values, v)
        default:
          return decodeStr(v)
      }
  }
  return throwUnknownDataType(v)
}

 function decompress(c) {
  const [values, root] = c
  return decode(values, root)
}

