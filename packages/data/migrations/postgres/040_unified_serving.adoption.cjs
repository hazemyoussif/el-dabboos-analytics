// Immutable migration 040 companion. Bundled from operational/adoption.ts with esbuild 0.28.2; all application dependencies are included.
// Regeneration is allowed only before deployment. Runtime adoption changes must never rewrite this applied artifact.
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/codegen/code.js
var require_code = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/codegen/code.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.regexpCode = exports2.getEsmExportName = exports2.getProperty = exports2.safeStringify = exports2.stringify = exports2.strConcat = exports2.addCodeArg = exports2.str = exports2._ = exports2.nil = exports2._Code = exports2.Name = exports2.IDENTIFIER = exports2._CodeOrName = void 0;
    var _CodeOrName = class {
    };
    exports2._CodeOrName = _CodeOrName;
    exports2.IDENTIFIER = /^[a-z$_][a-z$_0-9]*$/i;
    var Name = class extends _CodeOrName {
      constructor(s) {
        super();
        if (!exports2.IDENTIFIER.test(s))
          throw new Error("CodeGen: name must be a valid identifier");
        this.str = s;
      }
      toString() {
        return this.str;
      }
      emptyStr() {
        return false;
      }
      get names() {
        return { [this.str]: 1 };
      }
    };
    exports2.Name = Name;
    var _Code = class extends _CodeOrName {
      constructor(code) {
        super();
        this._items = typeof code === "string" ? [code] : code;
      }
      toString() {
        return this.str;
      }
      emptyStr() {
        if (this._items.length > 1)
          return false;
        const item = this._items[0];
        return item === "" || item === '""';
      }
      get str() {
        var _a;
        return (_a = this._str) !== null && _a !== void 0 ? _a : this._str = this._items.reduce((s, c) => `${s}${c}`, "");
      }
      get names() {
        var _a;
        return (_a = this._names) !== null && _a !== void 0 ? _a : this._names = this._items.reduce((names, c) => {
          if (c instanceof Name)
            names[c.str] = (names[c.str] || 0) + 1;
          return names;
        }, {});
      }
    };
    exports2._Code = _Code;
    exports2.nil = new _Code("");
    function _(strs, ...args) {
      const code = [strs[0]];
      let i = 0;
      while (i < args.length) {
        addCodeArg(code, args[i]);
        code.push(strs[++i]);
      }
      return new _Code(code);
    }
    exports2._ = _;
    var plus = new _Code("+");
    function str(strs, ...args) {
      const expr = [safeStringify(strs[0])];
      let i = 0;
      while (i < args.length) {
        expr.push(plus);
        addCodeArg(expr, args[i]);
        expr.push(plus, safeStringify(strs[++i]));
      }
      optimize(expr);
      return new _Code(expr);
    }
    exports2.str = str;
    function addCodeArg(code, arg) {
      if (arg instanceof _Code)
        code.push(...arg._items);
      else if (arg instanceof Name)
        code.push(arg);
      else
        code.push(interpolate(arg));
    }
    exports2.addCodeArg = addCodeArg;
    function optimize(expr) {
      let i = 1;
      while (i < expr.length - 1) {
        if (expr[i] === plus) {
          const res = mergeExprItems(expr[i - 1], expr[i + 1]);
          if (res !== void 0) {
            expr.splice(i - 1, 3, res);
            continue;
          }
          expr[i++] = "+";
        }
        i++;
      }
    }
    function mergeExprItems(a, b) {
      if (b === '""')
        return a;
      if (a === '""')
        return b;
      if (typeof a == "string") {
        if (b instanceof Name || a[a.length - 1] !== '"')
          return;
        if (typeof b != "string")
          return `${a.slice(0, -1)}${b}"`;
        if (b[0] === '"')
          return a.slice(0, -1) + b.slice(1);
        return;
      }
      if (typeof b == "string" && b[0] === '"' && !(a instanceof Name))
        return `"${a}${b.slice(1)}`;
      return;
    }
    function strConcat(c1, c2) {
      return c2.emptyStr() ? c1 : c1.emptyStr() ? c2 : str`${c1}${c2}`;
    }
    exports2.strConcat = strConcat;
    function interpolate(x) {
      return typeof x == "number" || typeof x == "boolean" || x === null ? x : safeStringify(Array.isArray(x) ? x.join(",") : x);
    }
    function stringify(x) {
      return new _Code(safeStringify(x));
    }
    exports2.stringify = stringify;
    function safeStringify(x) {
      return JSON.stringify(x).replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
    }
    exports2.safeStringify = safeStringify;
    function getProperty(key) {
      return typeof key == "string" && exports2.IDENTIFIER.test(key) ? new _Code(`.${key}`) : _`[${key}]`;
    }
    exports2.getProperty = getProperty;
    function getEsmExportName(key) {
      if (typeof key == "string" && exports2.IDENTIFIER.test(key)) {
        return new _Code(`${key}`);
      }
      throw new Error(`CodeGen: invalid export name: ${key}, use explicit $id name mapping`);
    }
    exports2.getEsmExportName = getEsmExportName;
    function regexpCode(rx) {
      return new _Code(rx.toString());
    }
    exports2.regexpCode = regexpCode;
  }
});

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/codegen/scope.js
var require_scope = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/codegen/scope.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ValueScope = exports2.ValueScopeName = exports2.Scope = exports2.varKinds = exports2.UsedValueState = void 0;
    var code_1 = require_code();
    var ValueError = class extends Error {
      constructor(name) {
        super(`CodeGen: "code" for ${name} not defined`);
        this.value = name.value;
      }
    };
    var UsedValueState;
    (function(UsedValueState2) {
      UsedValueState2[UsedValueState2["Started"] = 0] = "Started";
      UsedValueState2[UsedValueState2["Completed"] = 1] = "Completed";
    })(UsedValueState || (exports2.UsedValueState = UsedValueState = {}));
    exports2.varKinds = {
      const: new code_1.Name("const"),
      let: new code_1.Name("let"),
      var: new code_1.Name("var")
    };
    var Scope = class {
      constructor({ prefixes, parent } = {}) {
        this._names = {};
        this._prefixes = prefixes;
        this._parent = parent;
      }
      toName(nameOrPrefix) {
        return nameOrPrefix instanceof code_1.Name ? nameOrPrefix : this.name(nameOrPrefix);
      }
      name(prefix) {
        return new code_1.Name(this._newName(prefix));
      }
      _newName(prefix) {
        const ng = this._names[prefix] || this._nameGroup(prefix);
        return `${prefix}${ng.index++}`;
      }
      _nameGroup(prefix) {
        var _a, _b;
        if (((_b = (_a = this._parent) === null || _a === void 0 ? void 0 : _a._prefixes) === null || _b === void 0 ? void 0 : _b.has(prefix)) || this._prefixes && !this._prefixes.has(prefix)) {
          throw new Error(`CodeGen: prefix "${prefix}" is not allowed in this scope`);
        }
        return this._names[prefix] = { prefix, index: 0 };
      }
    };
    exports2.Scope = Scope;
    var ValueScopeName = class extends code_1.Name {
      constructor(prefix, nameStr) {
        super(nameStr);
        this.prefix = prefix;
      }
      setValue(value, { property, itemIndex }) {
        this.value = value;
        this.scopePath = (0, code_1._)`.${new code_1.Name(property)}[${itemIndex}]`;
      }
    };
    exports2.ValueScopeName = ValueScopeName;
    var line = (0, code_1._)`\n`;
    var ValueScope = class extends Scope {
      constructor(opts) {
        super(opts);
        this._values = {};
        this._scope = opts.scope;
        this.opts = { ...opts, _n: opts.lines ? line : code_1.nil };
      }
      get() {
        return this._scope;
      }
      name(prefix) {
        return new ValueScopeName(prefix, this._newName(prefix));
      }
      value(nameOrPrefix, value) {
        var _a;
        if (value.ref === void 0)
          throw new Error("CodeGen: ref must be passed in value");
        const name = this.toName(nameOrPrefix);
        const { prefix } = name;
        const valueKey = (_a = value.key) !== null && _a !== void 0 ? _a : value.ref;
        let vs = this._values[prefix];
        if (vs) {
          const _name = vs.get(valueKey);
          if (_name)
            return _name;
        } else {
          vs = this._values[prefix] = /* @__PURE__ */ new Map();
        }
        vs.set(valueKey, name);
        const s = this._scope[prefix] || (this._scope[prefix] = []);
        const itemIndex = s.length;
        s[itemIndex] = value.ref;
        name.setValue(value, { property: prefix, itemIndex });
        return name;
      }
      getValue(prefix, keyOrRef) {
        const vs = this._values[prefix];
        if (!vs)
          return;
        return vs.get(keyOrRef);
      }
      scopeRefs(scopeName, values = this._values) {
        return this._reduceValues(values, (name) => {
          if (name.scopePath === void 0)
            throw new Error(`CodeGen: name "${name}" has no value`);
          return (0, code_1._)`${scopeName}${name.scopePath}`;
        });
      }
      scopeCode(values = this._values, usedValues, getCode) {
        return this._reduceValues(values, (name) => {
          if (name.value === void 0)
            throw new Error(`CodeGen: name "${name}" has no value`);
          return name.value.code;
        }, usedValues, getCode);
      }
      _reduceValues(values, valueCode, usedValues = {}, getCode) {
        let code = code_1.nil;
        for (const prefix in values) {
          const vs = values[prefix];
          if (!vs)
            continue;
          const nameSet = usedValues[prefix] = usedValues[prefix] || /* @__PURE__ */ new Map();
          vs.forEach((name) => {
            if (nameSet.has(name))
              return;
            nameSet.set(name, UsedValueState.Started);
            let c = valueCode(name);
            if (c) {
              const def = this.opts.es5 ? exports2.varKinds.var : exports2.varKinds.const;
              code = (0, code_1._)`${code}${def} ${name} = ${c};${this.opts._n}`;
            } else if (c = getCode === null || getCode === void 0 ? void 0 : getCode(name)) {
              code = (0, code_1._)`${code}${c}${this.opts._n}`;
            } else {
              throw new ValueError(name);
            }
            nameSet.set(name, UsedValueState.Completed);
          });
        }
        return code;
      }
    };
    exports2.ValueScope = ValueScope;
  }
});

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/codegen/index.js
var require_codegen = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/codegen/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.or = exports2.and = exports2.not = exports2.CodeGen = exports2.operators = exports2.varKinds = exports2.ValueScopeName = exports2.ValueScope = exports2.Scope = exports2.Name = exports2.regexpCode = exports2.stringify = exports2.getProperty = exports2.nil = exports2.strConcat = exports2.str = exports2._ = void 0;
    var code_1 = require_code();
    var scope_1 = require_scope();
    var code_2 = require_code();
    Object.defineProperty(exports2, "_", { enumerable: true, get: function() {
      return code_2._;
    } });
    Object.defineProperty(exports2, "str", { enumerable: true, get: function() {
      return code_2.str;
    } });
    Object.defineProperty(exports2, "strConcat", { enumerable: true, get: function() {
      return code_2.strConcat;
    } });
    Object.defineProperty(exports2, "nil", { enumerable: true, get: function() {
      return code_2.nil;
    } });
    Object.defineProperty(exports2, "getProperty", { enumerable: true, get: function() {
      return code_2.getProperty;
    } });
    Object.defineProperty(exports2, "stringify", { enumerable: true, get: function() {
      return code_2.stringify;
    } });
    Object.defineProperty(exports2, "regexpCode", { enumerable: true, get: function() {
      return code_2.regexpCode;
    } });
    Object.defineProperty(exports2, "Name", { enumerable: true, get: function() {
      return code_2.Name;
    } });
    var scope_2 = require_scope();
    Object.defineProperty(exports2, "Scope", { enumerable: true, get: function() {
      return scope_2.Scope;
    } });
    Object.defineProperty(exports2, "ValueScope", { enumerable: true, get: function() {
      return scope_2.ValueScope;
    } });
    Object.defineProperty(exports2, "ValueScopeName", { enumerable: true, get: function() {
      return scope_2.ValueScopeName;
    } });
    Object.defineProperty(exports2, "varKinds", { enumerable: true, get: function() {
      return scope_2.varKinds;
    } });
    exports2.operators = {
      GT: new code_1._Code(">"),
      GTE: new code_1._Code(">="),
      LT: new code_1._Code("<"),
      LTE: new code_1._Code("<="),
      EQ: new code_1._Code("==="),
      NEQ: new code_1._Code("!=="),
      NOT: new code_1._Code("!"),
      OR: new code_1._Code("||"),
      AND: new code_1._Code("&&"),
      ADD: new code_1._Code("+")
    };
    var Node = class {
      optimizeNodes() {
        return this;
      }
      optimizeNames(_names, _constants) {
        return this;
      }
    };
    var Def = class extends Node {
      constructor(varKind, name, rhs) {
        super();
        this.varKind = varKind;
        this.name = name;
        this.rhs = rhs;
      }
      render({ es5, _n }) {
        const varKind = es5 ? scope_1.varKinds.var : this.varKind;
        const rhs = this.rhs === void 0 ? "" : ` = ${this.rhs}`;
        return `${varKind} ${this.name}${rhs};` + _n;
      }
      optimizeNames(names, constants) {
        if (!names[this.name.str])
          return;
        if (this.rhs)
          this.rhs = optimizeExpr(this.rhs, names, constants);
        return this;
      }
      get names() {
        return this.rhs instanceof code_1._CodeOrName ? this.rhs.names : {};
      }
    };
    var Assign = class extends Node {
      constructor(lhs, rhs, sideEffects) {
        super();
        this.lhs = lhs;
        this.rhs = rhs;
        this.sideEffects = sideEffects;
      }
      render({ _n }) {
        return `${this.lhs} = ${this.rhs};` + _n;
      }
      optimizeNames(names, constants) {
        if (this.lhs instanceof code_1.Name && !names[this.lhs.str] && !this.sideEffects)
          return;
        this.rhs = optimizeExpr(this.rhs, names, constants);
        return this;
      }
      get names() {
        const names = this.lhs instanceof code_1.Name ? {} : { ...this.lhs.names };
        return addExprNames(names, this.rhs);
      }
    };
    var AssignOp = class extends Assign {
      constructor(lhs, op, rhs, sideEffects) {
        super(lhs, rhs, sideEffects);
        this.op = op;
      }
      render({ _n }) {
        return `${this.lhs} ${this.op}= ${this.rhs};` + _n;
      }
    };
    var Label = class extends Node {
      constructor(label) {
        super();
        this.label = label;
        this.names = {};
      }
      render({ _n }) {
        return `${this.label}:` + _n;
      }
    };
    var Break = class extends Node {
      constructor(label) {
        super();
        this.label = label;
        this.names = {};
      }
      render({ _n }) {
        const label = this.label ? ` ${this.label}` : "";
        return `break${label};` + _n;
      }
    };
    var Throw = class extends Node {
      constructor(error) {
        super();
        this.error = error;
      }
      render({ _n }) {
        return `throw ${this.error};` + _n;
      }
      get names() {
        return this.error.names;
      }
    };
    var AnyCode = class extends Node {
      constructor(code) {
        super();
        this.code = code;
      }
      render({ _n }) {
        return `${this.code};` + _n;
      }
      optimizeNodes() {
        return `${this.code}` ? this : void 0;
      }
      optimizeNames(names, constants) {
        this.code = optimizeExpr(this.code, names, constants);
        return this;
      }
      get names() {
        return this.code instanceof code_1._CodeOrName ? this.code.names : {};
      }
    };
    var ParentNode = class extends Node {
      constructor(nodes = []) {
        super();
        this.nodes = nodes;
      }
      render(opts) {
        return this.nodes.reduce((code, n) => code + n.render(opts), "");
      }
      optimizeNodes() {
        const { nodes } = this;
        let i = nodes.length;
        while (i--) {
          const n = nodes[i].optimizeNodes();
          if (Array.isArray(n))
            nodes.splice(i, 1, ...n);
          else if (n)
            nodes[i] = n;
          else
            nodes.splice(i, 1);
        }
        return nodes.length > 0 ? this : void 0;
      }
      optimizeNames(names, constants) {
        const { nodes } = this;
        let i = nodes.length;
        while (i--) {
          const n = nodes[i];
          if (n.optimizeNames(names, constants))
            continue;
          subtractNames(names, n.names);
          nodes.splice(i, 1);
        }
        return nodes.length > 0 ? this : void 0;
      }
      get names() {
        return this.nodes.reduce((names, n) => addNames(names, n.names), {});
      }
    };
    var BlockNode = class extends ParentNode {
      render(opts) {
        return "{" + opts._n + super.render(opts) + "}" + opts._n;
      }
    };
    var Root = class extends ParentNode {
    };
    var Else = class extends BlockNode {
    };
    Else.kind = "else";
    var If = class _If extends BlockNode {
      constructor(condition, nodes) {
        super(nodes);
        this.condition = condition;
      }
      render(opts) {
        let code = `if(${this.condition})` + super.render(opts);
        if (this.else)
          code += "else " + this.else.render(opts);
        return code;
      }
      optimizeNodes() {
        super.optimizeNodes();
        const cond = this.condition;
        if (cond === true)
          return this.nodes;
        let e = this.else;
        if (e) {
          const ns = e.optimizeNodes();
          e = this.else = Array.isArray(ns) ? new Else(ns) : ns;
        }
        if (e) {
          if (cond === false)
            return e instanceof _If ? e : e.nodes;
          if (this.nodes.length)
            return this;
          return new _If(not(cond), e instanceof _If ? [e] : e.nodes);
        }
        if (cond === false || !this.nodes.length)
          return void 0;
        return this;
      }
      optimizeNames(names, constants) {
        var _a;
        this.else = (_a = this.else) === null || _a === void 0 ? void 0 : _a.optimizeNames(names, constants);
        if (!(super.optimizeNames(names, constants) || this.else))
          return;
        this.condition = optimizeExpr(this.condition, names, constants);
        return this;
      }
      get names() {
        const names = super.names;
        addExprNames(names, this.condition);
        if (this.else)
          addNames(names, this.else.names);
        return names;
      }
    };
    If.kind = "if";
    var For = class extends BlockNode {
    };
    For.kind = "for";
    var ForLoop = class extends For {
      constructor(iteration) {
        super();
        this.iteration = iteration;
      }
      render(opts) {
        return `for(${this.iteration})` + super.render(opts);
      }
      optimizeNames(names, constants) {
        if (!super.optimizeNames(names, constants))
          return;
        this.iteration = optimizeExpr(this.iteration, names, constants);
        return this;
      }
      get names() {
        return addNames(super.names, this.iteration.names);
      }
    };
    var ForRange = class extends For {
      constructor(varKind, name, from, to) {
        super();
        this.varKind = varKind;
        this.name = name;
        this.from = from;
        this.to = to;
      }
      render(opts) {
        const varKind = opts.es5 ? scope_1.varKinds.var : this.varKind;
        const { name, from, to } = this;
        return `for(${varKind} ${name}=${from}; ${name}<${to}; ${name}++)` + super.render(opts);
      }
      get names() {
        const names = addExprNames(super.names, this.from);
        return addExprNames(names, this.to);
      }
    };
    var ForIter = class extends For {
      constructor(loop, varKind, name, iterable) {
        super();
        this.loop = loop;
        this.varKind = varKind;
        this.name = name;
        this.iterable = iterable;
      }
      render(opts) {
        return `for(${this.varKind} ${this.name} ${this.loop} ${this.iterable})` + super.render(opts);
      }
      optimizeNames(names, constants) {
        if (!super.optimizeNames(names, constants))
          return;
        this.iterable = optimizeExpr(this.iterable, names, constants);
        return this;
      }
      get names() {
        return addNames(super.names, this.iterable.names);
      }
    };
    var Func = class extends BlockNode {
      constructor(name, args, async) {
        super();
        this.name = name;
        this.args = args;
        this.async = async;
      }
      render(opts) {
        const _async = this.async ? "async " : "";
        return `${_async}function ${this.name}(${this.args})` + super.render(opts);
      }
    };
    Func.kind = "func";
    var Return = class extends ParentNode {
      render(opts) {
        return "return " + super.render(opts);
      }
    };
    Return.kind = "return";
    var Try = class extends BlockNode {
      render(opts) {
        let code = "try" + super.render(opts);
        if (this.catch)
          code += this.catch.render(opts);
        if (this.finally)
          code += this.finally.render(opts);
        return code;
      }
      optimizeNodes() {
        var _a, _b;
        super.optimizeNodes();
        (_a = this.catch) === null || _a === void 0 ? void 0 : _a.optimizeNodes();
        (_b = this.finally) === null || _b === void 0 ? void 0 : _b.optimizeNodes();
        return this;
      }
      optimizeNames(names, constants) {
        var _a, _b;
        super.optimizeNames(names, constants);
        (_a = this.catch) === null || _a === void 0 ? void 0 : _a.optimizeNames(names, constants);
        (_b = this.finally) === null || _b === void 0 ? void 0 : _b.optimizeNames(names, constants);
        return this;
      }
      get names() {
        const names = super.names;
        if (this.catch)
          addNames(names, this.catch.names);
        if (this.finally)
          addNames(names, this.finally.names);
        return names;
      }
    };
    var Catch = class extends BlockNode {
      constructor(error) {
        super();
        this.error = error;
      }
      render(opts) {
        return `catch(${this.error})` + super.render(opts);
      }
    };
    Catch.kind = "catch";
    var Finally = class extends BlockNode {
      render(opts) {
        return "finally" + super.render(opts);
      }
    };
    Finally.kind = "finally";
    var CodeGen = class {
      constructor(extScope, opts = {}) {
        this._values = {};
        this._blockStarts = [];
        this._constants = {};
        this.opts = { ...opts, _n: opts.lines ? "\n" : "" };
        this._extScope = extScope;
        this._scope = new scope_1.Scope({ parent: extScope });
        this._nodes = [new Root()];
      }
      toString() {
        return this._root.render(this.opts);
      }
      // returns unique name in the internal scope
      name(prefix) {
        return this._scope.name(prefix);
      }
      // reserves unique name in the external scope
      scopeName(prefix) {
        return this._extScope.name(prefix);
      }
      // reserves unique name in the external scope and assigns value to it
      scopeValue(prefixOrName, value) {
        const name = this._extScope.value(prefixOrName, value);
        const vs = this._values[name.prefix] || (this._values[name.prefix] = /* @__PURE__ */ new Set());
        vs.add(name);
        return name;
      }
      getScopeValue(prefix, keyOrRef) {
        return this._extScope.getValue(prefix, keyOrRef);
      }
      // return code that assigns values in the external scope to the names that are used internally
      // (same names that were returned by gen.scopeName or gen.scopeValue)
      scopeRefs(scopeName) {
        return this._extScope.scopeRefs(scopeName, this._values);
      }
      scopeCode() {
        return this._extScope.scopeCode(this._values);
      }
      _def(varKind, nameOrPrefix, rhs, constant) {
        const name = this._scope.toName(nameOrPrefix);
        if (rhs !== void 0 && constant)
          this._constants[name.str] = rhs;
        this._leafNode(new Def(varKind, name, rhs));
        return name;
      }
      // `const` declaration (`var` in es5 mode)
      const(nameOrPrefix, rhs, _constant) {
        return this._def(scope_1.varKinds.const, nameOrPrefix, rhs, _constant);
      }
      // `let` declaration with optional assignment (`var` in es5 mode)
      let(nameOrPrefix, rhs, _constant) {
        return this._def(scope_1.varKinds.let, nameOrPrefix, rhs, _constant);
      }
      // `var` declaration with optional assignment
      var(nameOrPrefix, rhs, _constant) {
        return this._def(scope_1.varKinds.var, nameOrPrefix, rhs, _constant);
      }
      // assignment code
      assign(lhs, rhs, sideEffects) {
        return this._leafNode(new Assign(lhs, rhs, sideEffects));
      }
      // `+=` code
      add(lhs, rhs) {
        return this._leafNode(new AssignOp(lhs, exports2.operators.ADD, rhs));
      }
      // appends passed SafeExpr to code or executes Block
      code(c) {
        if (typeof c == "function")
          c();
        else if (c !== code_1.nil)
          this._leafNode(new AnyCode(c));
        return this;
      }
      // returns code for object literal for the passed argument list of key-value pairs
      object(...keyValues) {
        const code = ["{"];
        for (const [key, value] of keyValues) {
          if (code.length > 1)
            code.push(",");
          code.push(key);
          if (key !== value || this.opts.es5) {
            code.push(":");
            (0, code_1.addCodeArg)(code, value);
          }
        }
        code.push("}");
        return new code_1._Code(code);
      }
      // `if` clause (or statement if `thenBody` and, optionally, `elseBody` are passed)
      if(condition, thenBody, elseBody) {
        this._blockNode(new If(condition));
        if (thenBody && elseBody) {
          this.code(thenBody).else().code(elseBody).endIf();
        } else if (thenBody) {
          this.code(thenBody).endIf();
        } else if (elseBody) {
          throw new Error('CodeGen: "else" body without "then" body');
        }
        return this;
      }
      // `else if` clause - invalid without `if` or after `else` clauses
      elseIf(condition) {
        return this._elseNode(new If(condition));
      }
      // `else` clause - only valid after `if` or `else if` clauses
      else() {
        return this._elseNode(new Else());
      }
      // end `if` statement (needed if gen.if was used only with condition)
      endIf() {
        return this._endBlockNode(If, Else);
      }
      _for(node, forBody) {
        this._blockNode(node);
        if (forBody)
          this.code(forBody).endFor();
        return this;
      }
      // a generic `for` clause (or statement if `forBody` is passed)
      for(iteration, forBody) {
        return this._for(new ForLoop(iteration), forBody);
      }
      // `for` statement for a range of values
      forRange(nameOrPrefix, from, to, forBody, varKind = this.opts.es5 ? scope_1.varKinds.var : scope_1.varKinds.let) {
        const name = this._scope.toName(nameOrPrefix);
        return this._for(new ForRange(varKind, name, from, to), () => forBody(name));
      }
      // `for-of` statement (in es5 mode replace with a normal for loop)
      forOf(nameOrPrefix, iterable, forBody, varKind = scope_1.varKinds.const) {
        const name = this._scope.toName(nameOrPrefix);
        if (this.opts.es5) {
          const arr = iterable instanceof code_1.Name ? iterable : this.var("_arr", iterable);
          return this.forRange("_i", 0, (0, code_1._)`${arr}.length`, (i) => {
            this.var(name, (0, code_1._)`${arr}[${i}]`);
            forBody(name);
          });
        }
        return this._for(new ForIter("of", varKind, name, iterable), () => forBody(name));
      }
      // `for-in` statement.
      // With option `ownProperties` replaced with a `for-of` loop for object keys
      forIn(nameOrPrefix, obj, forBody, varKind = this.opts.es5 ? scope_1.varKinds.var : scope_1.varKinds.const) {
        if (this.opts.ownProperties) {
          return this.forOf(nameOrPrefix, (0, code_1._)`Object.keys(${obj})`, forBody);
        }
        const name = this._scope.toName(nameOrPrefix);
        return this._for(new ForIter("in", varKind, name, obj), () => forBody(name));
      }
      // end `for` loop
      endFor() {
        return this._endBlockNode(For);
      }
      // `label` statement
      label(label) {
        return this._leafNode(new Label(label));
      }
      // `break` statement
      break(label) {
        return this._leafNode(new Break(label));
      }
      // `return` statement
      return(value) {
        const node = new Return();
        this._blockNode(node);
        this.code(value);
        if (node.nodes.length !== 1)
          throw new Error('CodeGen: "return" should have one node');
        return this._endBlockNode(Return);
      }
      // `try` statement
      try(tryBody, catchCode, finallyCode) {
        if (!catchCode && !finallyCode)
          throw new Error('CodeGen: "try" without "catch" and "finally"');
        const node = new Try();
        this._blockNode(node);
        this.code(tryBody);
        if (catchCode) {
          const error = this.name("e");
          this._currNode = node.catch = new Catch(error);
          catchCode(error);
        }
        if (finallyCode) {
          this._currNode = node.finally = new Finally();
          this.code(finallyCode);
        }
        return this._endBlockNode(Catch, Finally);
      }
      // `throw` statement
      throw(error) {
        return this._leafNode(new Throw(error));
      }
      // start self-balancing block
      block(body, nodeCount) {
        this._blockStarts.push(this._nodes.length);
        if (body)
          this.code(body).endBlock(nodeCount);
        return this;
      }
      // end the current self-balancing block
      endBlock(nodeCount) {
        const len = this._blockStarts.pop();
        if (len === void 0)
          throw new Error("CodeGen: not in self-balancing block");
        const toClose = this._nodes.length - len;
        if (toClose < 0 || nodeCount !== void 0 && toClose !== nodeCount) {
          throw new Error(`CodeGen: wrong number of nodes: ${toClose} vs ${nodeCount} expected`);
        }
        this._nodes.length = len;
        return this;
      }
      // `function` heading (or definition if funcBody is passed)
      func(name, args = code_1.nil, async, funcBody) {
        this._blockNode(new Func(name, args, async));
        if (funcBody)
          this.code(funcBody).endFunc();
        return this;
      }
      // end function definition
      endFunc() {
        return this._endBlockNode(Func);
      }
      optimize(n = 1) {
        while (n-- > 0) {
          this._root.optimizeNodes();
          this._root.optimizeNames(this._root.names, this._constants);
        }
      }
      _leafNode(node) {
        this._currNode.nodes.push(node);
        return this;
      }
      _blockNode(node) {
        this._currNode.nodes.push(node);
        this._nodes.push(node);
      }
      _endBlockNode(N1, N2) {
        const n = this._currNode;
        if (n instanceof N1 || N2 && n instanceof N2) {
          this._nodes.pop();
          return this;
        }
        throw new Error(`CodeGen: not in block "${N2 ? `${N1.kind}/${N2.kind}` : N1.kind}"`);
      }
      _elseNode(node) {
        const n = this._currNode;
        if (!(n instanceof If)) {
          throw new Error('CodeGen: "else" without "if"');
        }
        this._currNode = n.else = node;
        return this;
      }
      get _root() {
        return this._nodes[0];
      }
      get _currNode() {
        const ns = this._nodes;
        return ns[ns.length - 1];
      }
      set _currNode(node) {
        const ns = this._nodes;
        ns[ns.length - 1] = node;
      }
    };
    exports2.CodeGen = CodeGen;
    function addNames(names, from) {
      for (const n in from)
        names[n] = (names[n] || 0) + (from[n] || 0);
      return names;
    }
    function addExprNames(names, from) {
      return from instanceof code_1._CodeOrName ? addNames(names, from.names) : names;
    }
    function optimizeExpr(expr, names, constants) {
      if (expr instanceof code_1.Name)
        return replaceName(expr);
      if (!canOptimize(expr))
        return expr;
      return new code_1._Code(expr._items.reduce((items, c) => {
        if (c instanceof code_1.Name)
          c = replaceName(c);
        if (c instanceof code_1._Code)
          items.push(...c._items);
        else
          items.push(c);
        return items;
      }, []));
      function replaceName(n) {
        const c = constants[n.str];
        if (c === void 0 || names[n.str] !== 1)
          return n;
        delete names[n.str];
        return c;
      }
      function canOptimize(e) {
        return e instanceof code_1._Code && e._items.some((c) => c instanceof code_1.Name && names[c.str] === 1 && constants[c.str] !== void 0);
      }
    }
    function subtractNames(names, from) {
      for (const n in from)
        names[n] = (names[n] || 0) - (from[n] || 0);
    }
    function not(x) {
      return typeof x == "boolean" || typeof x == "number" || x === null ? !x : (0, code_1._)`!${par(x)}`;
    }
    exports2.not = not;
    var andCode = mappend(exports2.operators.AND);
    function and(...args) {
      return args.reduce(andCode);
    }
    exports2.and = and;
    var orCode = mappend(exports2.operators.OR);
    function or(...args) {
      return args.reduce(orCode);
    }
    exports2.or = or;
    function mappend(op) {
      return (x, y) => x === code_1.nil ? y : y === code_1.nil ? x : (0, code_1._)`${par(x)} ${op} ${par(y)}`;
    }
    function par(x) {
      return x instanceof code_1.Name ? x : (0, code_1._)`(${x})`;
    }
  }
});

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/util.js
var require_util = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/util.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.checkStrictMode = exports2.getErrorPath = exports2.Type = exports2.useFunc = exports2.setEvaluated = exports2.evaluatedPropsToName = exports2.mergeEvaluated = exports2.eachItem = exports2.unescapeJsonPointer = exports2.escapeJsonPointer = exports2.escapeFragment = exports2.unescapeFragment = exports2.schemaRefOrVal = exports2.schemaHasRulesButRef = exports2.schemaHasRules = exports2.checkUnknownRules = exports2.alwaysValidSchema = exports2.toHash = void 0;
    var codegen_1 = require_codegen();
    var code_1 = require_code();
    function toHash(arr) {
      const hash = {};
      for (const item of arr)
        hash[item] = true;
      return hash;
    }
    exports2.toHash = toHash;
    function alwaysValidSchema(it, schema) {
      if (typeof schema == "boolean")
        return schema;
      if (Object.keys(schema).length === 0)
        return true;
      checkUnknownRules(it, schema);
      return !schemaHasRules(schema, it.self.RULES.all);
    }
    exports2.alwaysValidSchema = alwaysValidSchema;
    function checkUnknownRules(it, schema = it.schema) {
      const { opts, self } = it;
      if (!opts.strictSchema)
        return;
      if (typeof schema === "boolean")
        return;
      const rules = self.RULES.keywords;
      for (const key in schema) {
        if (!rules[key])
          checkStrictMode(it, `unknown keyword: "${key}"`);
      }
    }
    exports2.checkUnknownRules = checkUnknownRules;
    function schemaHasRules(schema, rules) {
      if (typeof schema == "boolean")
        return !schema;
      for (const key in schema)
        if (rules[key])
          return true;
      return false;
    }
    exports2.schemaHasRules = schemaHasRules;
    function schemaHasRulesButRef(schema, RULES) {
      if (typeof schema == "boolean")
        return !schema;
      for (const key in schema)
        if (key !== "$ref" && RULES.all[key])
          return true;
      return false;
    }
    exports2.schemaHasRulesButRef = schemaHasRulesButRef;
    function schemaRefOrVal({ topSchemaRef, schemaPath }, schema, keyword, $data) {
      if (!$data) {
        if (typeof schema == "number" || typeof schema == "boolean")
          return schema;
        if (typeof schema == "string")
          return (0, codegen_1._)`${schema}`;
      }
      return (0, codegen_1._)`${topSchemaRef}${schemaPath}${(0, codegen_1.getProperty)(keyword)}`;
    }
    exports2.schemaRefOrVal = schemaRefOrVal;
    function unescapeFragment(str) {
      return unescapeJsonPointer(decodeURIComponent(str));
    }
    exports2.unescapeFragment = unescapeFragment;
    function escapeFragment(str) {
      return encodeURIComponent(escapeJsonPointer(str));
    }
    exports2.escapeFragment = escapeFragment;
    function escapeJsonPointer(str) {
      if (typeof str == "number")
        return `${str}`;
      return str.replace(/~/g, "~0").replace(/\//g, "~1");
    }
    exports2.escapeJsonPointer = escapeJsonPointer;
    function unescapeJsonPointer(str) {
      return str.replace(/~1/g, "/").replace(/~0/g, "~");
    }
    exports2.unescapeJsonPointer = unescapeJsonPointer;
    function eachItem(xs, f) {
      if (Array.isArray(xs)) {
        for (const x of xs)
          f(x);
      } else {
        f(xs);
      }
    }
    exports2.eachItem = eachItem;
    function makeMergeEvaluated({ mergeNames, mergeToName, mergeValues, resultToName }) {
      return (gen, from, to, toName) => {
        const res = to === void 0 ? from : to instanceof codegen_1.Name ? (from instanceof codegen_1.Name ? mergeNames(gen, from, to) : mergeToName(gen, from, to), to) : from instanceof codegen_1.Name ? (mergeToName(gen, to, from), from) : mergeValues(from, to);
        return toName === codegen_1.Name && !(res instanceof codegen_1.Name) ? resultToName(gen, res) : res;
      };
    }
    exports2.mergeEvaluated = {
      props: makeMergeEvaluated({
        mergeNames: (gen, from, to) => gen.if((0, codegen_1._)`${to} !== true && ${from} !== undefined`, () => {
          gen.if((0, codegen_1._)`${from} === true`, () => gen.assign(to, true), () => gen.assign(to, (0, codegen_1._)`${to} || {}`).code((0, codegen_1._)`Object.assign(${to}, ${from})`));
        }),
        mergeToName: (gen, from, to) => gen.if((0, codegen_1._)`${to} !== true`, () => {
          if (from === true) {
            gen.assign(to, true);
          } else {
            gen.assign(to, (0, codegen_1._)`${to} || {}`);
            setEvaluated(gen, to, from);
          }
        }),
        mergeValues: (from, to) => from === true ? true : { ...from, ...to },
        resultToName: evaluatedPropsToName
      }),
      items: makeMergeEvaluated({
        mergeNames: (gen, from, to) => gen.if((0, codegen_1._)`${to} !== true && ${from} !== undefined`, () => gen.assign(to, (0, codegen_1._)`${from} === true ? true : ${to} > ${from} ? ${to} : ${from}`)),
        mergeToName: (gen, from, to) => gen.if((0, codegen_1._)`${to} !== true`, () => gen.assign(to, from === true ? true : (0, codegen_1._)`${to} > ${from} ? ${to} : ${from}`)),
        mergeValues: (from, to) => from === true ? true : Math.max(from, to),
        resultToName: (gen, items) => gen.var("items", items)
      })
    };
    function evaluatedPropsToName(gen, ps) {
      if (ps === true)
        return gen.var("props", true);
      const props = gen.var("props", (0, codegen_1._)`{}`);
      if (ps !== void 0)
        setEvaluated(gen, props, ps);
      return props;
    }
    exports2.evaluatedPropsToName = evaluatedPropsToName;
    function setEvaluated(gen, props, ps) {
      Object.keys(ps).forEach((p) => gen.assign((0, codegen_1._)`${props}${(0, codegen_1.getProperty)(p)}`, true));
    }
    exports2.setEvaluated = setEvaluated;
    var snippets = {};
    function useFunc(gen, f) {
      return gen.scopeValue("func", {
        ref: f,
        code: snippets[f.code] || (snippets[f.code] = new code_1._Code(f.code))
      });
    }
    exports2.useFunc = useFunc;
    var Type;
    (function(Type2) {
      Type2[Type2["Num"] = 0] = "Num";
      Type2[Type2["Str"] = 1] = "Str";
    })(Type || (exports2.Type = Type = {}));
    function getErrorPath(dataProp, dataPropType, jsPropertySyntax) {
      if (dataProp instanceof codegen_1.Name) {
        const isNumber = dataPropType === Type.Num;
        return jsPropertySyntax ? isNumber ? (0, codegen_1._)`"[" + ${dataProp} + "]"` : (0, codegen_1._)`"['" + ${dataProp} + "']"` : isNumber ? (0, codegen_1._)`"/" + ${dataProp}` : (0, codegen_1._)`"/" + ${dataProp}.replace(/~/g, "~0").replace(/\\//g, "~1")`;
      }
      return jsPropertySyntax ? (0, codegen_1.getProperty)(dataProp).toString() : "/" + escapeJsonPointer(dataProp);
    }
    exports2.getErrorPath = getErrorPath;
    function checkStrictMode(it, msg, mode = it.opts.strictSchema) {
      if (!mode)
        return;
      msg = `strict mode: ${msg}`;
      if (mode === true)
        throw new Error(msg);
      it.self.logger.warn(msg);
    }
    exports2.checkStrictMode = checkStrictMode;
  }
});

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/names.js
var require_names = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/names.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var names = {
      // validation function arguments
      data: new codegen_1.Name("data"),
      // data passed to validation function
      // args passed from referencing schema
      valCxt: new codegen_1.Name("valCxt"),
      // validation/data context - should not be used directly, it is destructured to the names below
      instancePath: new codegen_1.Name("instancePath"),
      parentData: new codegen_1.Name("parentData"),
      parentDataProperty: new codegen_1.Name("parentDataProperty"),
      rootData: new codegen_1.Name("rootData"),
      // root data - same as the data passed to the first/top validation function
      dynamicAnchors: new codegen_1.Name("dynamicAnchors"),
      // used to support recursiveRef and dynamicRef
      // function scoped variables
      vErrors: new codegen_1.Name("vErrors"),
      // null or array of validation errors
      errors: new codegen_1.Name("errors"),
      // counter of validation errors
      this: new codegen_1.Name("this"),
      // "globals"
      self: new codegen_1.Name("self"),
      scope: new codegen_1.Name("scope"),
      // JTD serialize/parse name for JSON string and position
      json: new codegen_1.Name("json"),
      jsonPos: new codegen_1.Name("jsonPos"),
      jsonLen: new codegen_1.Name("jsonLen"),
      jsonPart: new codegen_1.Name("jsonPart")
    };
    exports2.default = names;
  }
});

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/errors.js
var require_errors = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/errors.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.extendErrors = exports2.resetErrorsCount = exports2.reportExtraError = exports2.reportError = exports2.keyword$DataError = exports2.keywordError = void 0;
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var names_1 = require_names();
    exports2.keywordError = {
      message: ({ keyword }) => (0, codegen_1.str)`must pass "${keyword}" keyword validation`
    };
    exports2.keyword$DataError = {
      message: ({ keyword, schemaType }) => schemaType ? (0, codegen_1.str)`"${keyword}" keyword must be ${schemaType} ($data)` : (0, codegen_1.str)`"${keyword}" keyword is invalid ($data)`
    };
    function reportError(cxt, error = exports2.keywordError, errorPaths, overrideAllErrors) {
      const { it } = cxt;
      const { gen, compositeRule, allErrors } = it;
      const errObj = errorObjectCode(cxt, error, errorPaths);
      if (overrideAllErrors !== null && overrideAllErrors !== void 0 ? overrideAllErrors : compositeRule || allErrors) {
        addError(gen, errObj);
      } else {
        returnErrors(it, (0, codegen_1._)`[${errObj}]`);
      }
    }
    exports2.reportError = reportError;
    function reportExtraError(cxt, error = exports2.keywordError, errorPaths) {
      const { it } = cxt;
      const { gen, compositeRule, allErrors } = it;
      const errObj = errorObjectCode(cxt, error, errorPaths);
      addError(gen, errObj);
      if (!(compositeRule || allErrors)) {
        returnErrors(it, names_1.default.vErrors);
      }
    }
    exports2.reportExtraError = reportExtraError;
    function resetErrorsCount(gen, errsCount) {
      gen.assign(names_1.default.errors, errsCount);
      gen.if((0, codegen_1._)`${names_1.default.vErrors} !== null`, () => gen.if(errsCount, () => gen.assign((0, codegen_1._)`${names_1.default.vErrors}.length`, errsCount), () => gen.assign(names_1.default.vErrors, null)));
    }
    exports2.resetErrorsCount = resetErrorsCount;
    function extendErrors({ gen, keyword, schemaValue, data, errsCount, it }) {
      if (errsCount === void 0)
        throw new Error("ajv implementation error");
      const err = gen.name("err");
      gen.forRange("i", errsCount, names_1.default.errors, (i) => {
        gen.const(err, (0, codegen_1._)`${names_1.default.vErrors}[${i}]`);
        gen.if((0, codegen_1._)`${err}.instancePath === undefined`, () => gen.assign((0, codegen_1._)`${err}.instancePath`, (0, codegen_1.strConcat)(names_1.default.instancePath, it.errorPath)));
        gen.assign((0, codegen_1._)`${err}.schemaPath`, (0, codegen_1.str)`${it.errSchemaPath}/${keyword}`);
        if (it.opts.verbose) {
          gen.assign((0, codegen_1._)`${err}.schema`, schemaValue);
          gen.assign((0, codegen_1._)`${err}.data`, data);
        }
      });
    }
    exports2.extendErrors = extendErrors;
    function addError(gen, errObj) {
      const err = gen.const("err", errObj);
      gen.if((0, codegen_1._)`${names_1.default.vErrors} === null`, () => gen.assign(names_1.default.vErrors, (0, codegen_1._)`[${err}]`), (0, codegen_1._)`${names_1.default.vErrors}.push(${err})`);
      gen.code((0, codegen_1._)`${names_1.default.errors}++`);
    }
    function returnErrors(it, errs) {
      const { gen, validateName, schemaEnv } = it;
      if (schemaEnv.$async) {
        gen.throw((0, codegen_1._)`new ${it.ValidationError}(${errs})`);
      } else {
        gen.assign((0, codegen_1._)`${validateName}.errors`, errs);
        gen.return(false);
      }
    }
    var E = {
      keyword: new codegen_1.Name("keyword"),
      schemaPath: new codegen_1.Name("schemaPath"),
      // also used in JTD errors
      params: new codegen_1.Name("params"),
      propertyName: new codegen_1.Name("propertyName"),
      message: new codegen_1.Name("message"),
      schema: new codegen_1.Name("schema"),
      parentSchema: new codegen_1.Name("parentSchema")
    };
    function errorObjectCode(cxt, error, errorPaths) {
      const { createErrors } = cxt.it;
      if (createErrors === false)
        return (0, codegen_1._)`{}`;
      return errorObject(cxt, error, errorPaths);
    }
    function errorObject(cxt, error, errorPaths = {}) {
      const { gen, it } = cxt;
      const keyValues = [
        errorInstancePath(it, errorPaths),
        errorSchemaPath(cxt, errorPaths)
      ];
      extraErrorProps(cxt, error, keyValues);
      return gen.object(...keyValues);
    }
    function errorInstancePath({ errorPath }, { instancePath }) {
      const instPath = instancePath ? (0, codegen_1.str)`${errorPath}${(0, util_1.getErrorPath)(instancePath, util_1.Type.Str)}` : errorPath;
      return [names_1.default.instancePath, (0, codegen_1.strConcat)(names_1.default.instancePath, instPath)];
    }
    function errorSchemaPath({ keyword, it: { errSchemaPath } }, { schemaPath, parentSchema }) {
      let schPath = parentSchema ? errSchemaPath : (0, codegen_1.str)`${errSchemaPath}/${keyword}`;
      if (schemaPath) {
        schPath = (0, codegen_1.str)`${schPath}${(0, util_1.getErrorPath)(schemaPath, util_1.Type.Str)}`;
      }
      return [E.schemaPath, schPath];
    }
    function extraErrorProps(cxt, { params, message }, keyValues) {
      const { keyword, data, schemaValue, it } = cxt;
      const { opts, propertyName, topSchemaRef, schemaPath } = it;
      keyValues.push([E.keyword, keyword], [E.params, typeof params == "function" ? params(cxt) : params || (0, codegen_1._)`{}`]);
      if (opts.messages) {
        keyValues.push([E.message, typeof message == "function" ? message(cxt) : message]);
      }
      if (opts.verbose) {
        keyValues.push([E.schema, schemaValue], [E.parentSchema, (0, codegen_1._)`${topSchemaRef}${schemaPath}`], [names_1.default.data, data]);
      }
      if (propertyName)
        keyValues.push([E.propertyName, propertyName]);
    }
  }
});

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/validate/boolSchema.js
var require_boolSchema = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/validate/boolSchema.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.boolOrEmptySchema = exports2.topBoolOrEmptySchema = void 0;
    var errors_1 = require_errors();
    var codegen_1 = require_codegen();
    var names_1 = require_names();
    var boolError = {
      message: "boolean schema is false"
    };
    function topBoolOrEmptySchema(it) {
      const { gen, schema, validateName } = it;
      if (schema === false) {
        falseSchemaError(it, false);
      } else if (typeof schema == "object" && schema.$async === true) {
        gen.return(names_1.default.data);
      } else {
        gen.assign((0, codegen_1._)`${validateName}.errors`, null);
        gen.return(true);
      }
    }
    exports2.topBoolOrEmptySchema = topBoolOrEmptySchema;
    function boolOrEmptySchema(it, valid) {
      const { gen, schema } = it;
      if (schema === false) {
        gen.var(valid, false);
        falseSchemaError(it);
      } else {
        gen.var(valid, true);
      }
    }
    exports2.boolOrEmptySchema = boolOrEmptySchema;
    function falseSchemaError(it, overrideAllErrors) {
      const { gen, data } = it;
      const cxt = {
        gen,
        keyword: "false schema",
        data,
        schema: false,
        schemaCode: false,
        schemaValue: false,
        params: {},
        it
      };
      (0, errors_1.reportError)(cxt, boolError, void 0, overrideAllErrors);
    }
  }
});

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/rules.js
var require_rules = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/rules.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.getRules = exports2.isJSONType = void 0;
    var _jsonTypes = ["string", "number", "integer", "boolean", "null", "object", "array"];
    var jsonTypes = new Set(_jsonTypes);
    function isJSONType(x) {
      return typeof x == "string" && jsonTypes.has(x);
    }
    exports2.isJSONType = isJSONType;
    function getRules() {
      const groups = {
        number: { type: "number", rules: [] },
        string: { type: "string", rules: [] },
        array: { type: "array", rules: [] },
        object: { type: "object", rules: [] }
      };
      return {
        types: { ...groups, integer: true, boolean: true, null: true },
        rules: [{ rules: [] }, groups.number, groups.string, groups.array, groups.object],
        post: { rules: [] },
        all: {},
        keywords: {}
      };
    }
    exports2.getRules = getRules;
  }
});

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/validate/applicability.js
var require_applicability = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/validate/applicability.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.shouldUseRule = exports2.shouldUseGroup = exports2.schemaHasRulesForType = void 0;
    function schemaHasRulesForType({ schema, self }, type) {
      const group = self.RULES.types[type];
      return group && group !== true && shouldUseGroup(schema, group);
    }
    exports2.schemaHasRulesForType = schemaHasRulesForType;
    function shouldUseGroup(schema, group) {
      return group.rules.some((rule) => shouldUseRule(schema, rule));
    }
    exports2.shouldUseGroup = shouldUseGroup;
    function shouldUseRule(schema, rule) {
      var _a;
      return schema[rule.keyword] !== void 0 || ((_a = rule.definition.implements) === null || _a === void 0 ? void 0 : _a.some((kwd) => schema[kwd] !== void 0));
    }
    exports2.shouldUseRule = shouldUseRule;
  }
});

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/validate/dataType.js
var require_dataType = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/validate/dataType.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.reportTypeError = exports2.checkDataTypes = exports2.checkDataType = exports2.coerceAndCheckDataType = exports2.getJSONTypes = exports2.getSchemaTypes = exports2.DataType = void 0;
    var rules_1 = require_rules();
    var applicability_1 = require_applicability();
    var errors_1 = require_errors();
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var DataType;
    (function(DataType2) {
      DataType2[DataType2["Correct"] = 0] = "Correct";
      DataType2[DataType2["Wrong"] = 1] = "Wrong";
    })(DataType || (exports2.DataType = DataType = {}));
    function getSchemaTypes(schema) {
      const types2 = getJSONTypes(schema.type);
      const hasNull = types2.includes("null");
      if (hasNull) {
        if (schema.nullable === false)
          throw new Error("type: null contradicts nullable: false");
      } else {
        if (!types2.length && schema.nullable !== void 0) {
          throw new Error('"nullable" cannot be used without "type"');
        }
        if (schema.nullable === true)
          types2.push("null");
      }
      return types2;
    }
    exports2.getSchemaTypes = getSchemaTypes;
    function getJSONTypes(ts) {
      const types2 = Array.isArray(ts) ? ts : ts ? [ts] : [];
      if (types2.every(rules_1.isJSONType))
        return types2;
      throw new Error("type must be JSONType or JSONType[]: " + types2.join(","));
    }
    exports2.getJSONTypes = getJSONTypes;
    function coerceAndCheckDataType(it, types2) {
      const { gen, data, opts } = it;
      const coerceTo = coerceToTypes(types2, opts.coerceTypes);
      const checkTypes = types2.length > 0 && !(coerceTo.length === 0 && types2.length === 1 && (0, applicability_1.schemaHasRulesForType)(it, types2[0]));
      if (checkTypes) {
        const wrongType = checkDataTypes(types2, data, opts.strictNumbers, DataType.Wrong);
        gen.if(wrongType, () => {
          if (coerceTo.length)
            coerceData(it, types2, coerceTo);
          else
            reportTypeError(it);
        });
      }
      return checkTypes;
    }
    exports2.coerceAndCheckDataType = coerceAndCheckDataType;
    var COERCIBLE = /* @__PURE__ */ new Set(["string", "number", "integer", "boolean", "null"]);
    function coerceToTypes(types2, coerceTypes) {
      return coerceTypes ? types2.filter((t) => COERCIBLE.has(t) || coerceTypes === "array" && t === "array") : [];
    }
    function coerceData(it, types2, coerceTo) {
      const { gen, data, opts } = it;
      const dataType = gen.let("dataType", (0, codegen_1._)`typeof ${data}`);
      const coerced = gen.let("coerced", (0, codegen_1._)`undefined`);
      if (opts.coerceTypes === "array") {
        gen.if((0, codegen_1._)`${dataType} == 'object' && Array.isArray(${data}) && ${data}.length == 1`, () => gen.assign(data, (0, codegen_1._)`${data}[0]`).assign(dataType, (0, codegen_1._)`typeof ${data}`).if(checkDataTypes(types2, data, opts.strictNumbers), () => gen.assign(coerced, data)));
      }
      gen.if((0, codegen_1._)`${coerced} !== undefined`);
      for (const t of coerceTo) {
        if (COERCIBLE.has(t) || t === "array" && opts.coerceTypes === "array") {
          coerceSpecificType(t);
        }
      }
      gen.else();
      reportTypeError(it);
      gen.endIf();
      gen.if((0, codegen_1._)`${coerced} !== undefined`, () => {
        gen.assign(data, coerced);
        assignParentData(it, coerced);
      });
      function coerceSpecificType(t) {
        switch (t) {
          case "string":
            gen.elseIf((0, codegen_1._)`${dataType} == "number" || ${dataType} == "boolean"`).assign(coerced, (0, codegen_1._)`"" + ${data}`).elseIf((0, codegen_1._)`${data} === null`).assign(coerced, (0, codegen_1._)`""`);
            return;
          case "number":
            gen.elseIf((0, codegen_1._)`${dataType} == "boolean" || ${data} === null
              || (${dataType} == "string" && ${data} && ${data} == +${data})`).assign(coerced, (0, codegen_1._)`+${data}`);
            return;
          case "integer":
            gen.elseIf((0, codegen_1._)`${dataType} === "boolean" || ${data} === null
              || (${dataType} === "string" && ${data} && ${data} == +${data} && !(${data} % 1))`).assign(coerced, (0, codegen_1._)`+${data}`);
            return;
          case "boolean":
            gen.elseIf((0, codegen_1._)`${data} === "false" || ${data} === 0 || ${data} === null`).assign(coerced, false).elseIf((0, codegen_1._)`${data} === "true" || ${data} === 1`).assign(coerced, true);
            return;
          case "null":
            gen.elseIf((0, codegen_1._)`${data} === "" || ${data} === 0 || ${data} === false`);
            gen.assign(coerced, null);
            return;
          case "array":
            gen.elseIf((0, codegen_1._)`${dataType} === "string" || ${dataType} === "number"
              || ${dataType} === "boolean" || ${data} === null`).assign(coerced, (0, codegen_1._)`[${data}]`);
        }
      }
    }
    function assignParentData({ gen, parentData, parentDataProperty }, expr) {
      gen.if((0, codegen_1._)`${parentData} !== undefined`, () => gen.assign((0, codegen_1._)`${parentData}[${parentDataProperty}]`, expr));
    }
    function checkDataType(dataType, data, strictNums, correct = DataType.Correct) {
      const EQ = correct === DataType.Correct ? codegen_1.operators.EQ : codegen_1.operators.NEQ;
      let cond;
      switch (dataType) {
        case "null":
          return (0, codegen_1._)`${data} ${EQ} null`;
        case "array":
          cond = (0, codegen_1._)`Array.isArray(${data})`;
          break;
        case "object":
          cond = (0, codegen_1._)`${data} && typeof ${data} == "object" && !Array.isArray(${data})`;
          break;
        case "integer":
          cond = numCond((0, codegen_1._)`!(${data} % 1) && !isNaN(${data})`);
          break;
        case "number":
          cond = numCond();
          break;
        default:
          return (0, codegen_1._)`typeof ${data} ${EQ} ${dataType}`;
      }
      return correct === DataType.Correct ? cond : (0, codegen_1.not)(cond);
      function numCond(_cond = codegen_1.nil) {
        return (0, codegen_1.and)((0, codegen_1._)`typeof ${data} == "number"`, _cond, strictNums ? (0, codegen_1._)`isFinite(${data})` : codegen_1.nil);
      }
    }
    exports2.checkDataType = checkDataType;
    function checkDataTypes(dataTypes, data, strictNums, correct) {
      if (dataTypes.length === 1) {
        return checkDataType(dataTypes[0], data, strictNums, correct);
      }
      let cond;
      const types2 = (0, util_1.toHash)(dataTypes);
      if (types2.array && types2.object) {
        const notObj = (0, codegen_1._)`typeof ${data} != "object"`;
        cond = types2.null ? notObj : (0, codegen_1._)`!${data} || ${notObj}`;
        delete types2.null;
        delete types2.array;
        delete types2.object;
      } else {
        cond = codegen_1.nil;
      }
      if (types2.number)
        delete types2.integer;
      for (const t in types2)
        cond = (0, codegen_1.and)(cond, checkDataType(t, data, strictNums, correct));
      return cond;
    }
    exports2.checkDataTypes = checkDataTypes;
    var typeError = {
      message: ({ schema }) => `must be ${schema}`,
      params: ({ schema, schemaValue }) => typeof schema == "string" ? (0, codegen_1._)`{type: ${schema}}` : (0, codegen_1._)`{type: ${schemaValue}}`
    };
    function reportTypeError(it) {
      const cxt = getTypeErrorContext(it);
      (0, errors_1.reportError)(cxt, typeError);
    }
    exports2.reportTypeError = reportTypeError;
    function getTypeErrorContext(it) {
      const { gen, data, schema } = it;
      const schemaCode = (0, util_1.schemaRefOrVal)(it, schema, "type");
      return {
        gen,
        keyword: "type",
        data,
        schema: schema.type,
        schemaCode,
        schemaValue: schemaCode,
        parentSchema: schema,
        params: {},
        it
      };
    }
  }
});

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/validate/defaults.js
var require_defaults = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/validate/defaults.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.assignDefaults = void 0;
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    function assignDefaults(it, ty) {
      const { properties, items } = it.schema;
      if (ty === "object" && properties) {
        for (const key in properties) {
          assignDefault(it, key, properties[key].default);
        }
      } else if (ty === "array" && Array.isArray(items)) {
        items.forEach((sch, i) => assignDefault(it, i, sch.default));
      }
    }
    exports2.assignDefaults = assignDefaults;
    function assignDefault(it, prop, defaultValue) {
      const { gen, compositeRule, data, opts } = it;
      if (defaultValue === void 0)
        return;
      const childData = (0, codegen_1._)`${data}${(0, codegen_1.getProperty)(prop)}`;
      if (compositeRule) {
        (0, util_1.checkStrictMode)(it, `default is ignored for: ${childData}`);
        return;
      }
      let condition = (0, codegen_1._)`${childData} === undefined`;
      if (opts.useDefaults === "empty") {
        condition = (0, codegen_1._)`${condition} || ${childData} === null || ${childData} === ""`;
      }
      gen.if(condition, (0, codegen_1._)`${childData} = ${(0, codegen_1.stringify)(defaultValue)}`);
    }
  }
});

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/code.js
var require_code2 = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/code.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.validateUnion = exports2.validateArray = exports2.usePattern = exports2.callValidateCode = exports2.schemaProperties = exports2.allSchemaProperties = exports2.noPropertyInData = exports2.propertyInData = exports2.isOwnProperty = exports2.hasPropFunc = exports2.reportMissingProp = exports2.checkMissingProp = exports2.checkReportMissingProp = void 0;
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var names_1 = require_names();
    var util_2 = require_util();
    function checkReportMissingProp(cxt, prop) {
      const { gen, data, it } = cxt;
      gen.if(noPropertyInData(gen, data, prop, it.opts.ownProperties), () => {
        cxt.setParams({ missingProperty: (0, codegen_1._)`${prop}` }, true);
        cxt.error();
      });
    }
    exports2.checkReportMissingProp = checkReportMissingProp;
    function checkMissingProp({ gen, data, it: { opts } }, properties, missing) {
      return (0, codegen_1.or)(...properties.map((prop) => (0, codegen_1.and)(noPropertyInData(gen, data, prop, opts.ownProperties), (0, codegen_1._)`${missing} = ${prop}`)));
    }
    exports2.checkMissingProp = checkMissingProp;
    function reportMissingProp(cxt, missing) {
      cxt.setParams({ missingProperty: missing }, true);
      cxt.error();
    }
    exports2.reportMissingProp = reportMissingProp;
    function hasPropFunc(gen) {
      return gen.scopeValue("func", {
        // eslint-disable-next-line @typescript-eslint/unbound-method
        ref: Object.prototype.hasOwnProperty,
        code: (0, codegen_1._)`Object.prototype.hasOwnProperty`
      });
    }
    exports2.hasPropFunc = hasPropFunc;
    function isOwnProperty(gen, data, property) {
      return (0, codegen_1._)`${hasPropFunc(gen)}.call(${data}, ${property})`;
    }
    exports2.isOwnProperty = isOwnProperty;
    function propertyInData(gen, data, property, ownProperties) {
      const cond = (0, codegen_1._)`${data}${(0, codegen_1.getProperty)(property)} !== undefined`;
      return ownProperties ? (0, codegen_1._)`${cond} && ${isOwnProperty(gen, data, property)}` : cond;
    }
    exports2.propertyInData = propertyInData;
    function noPropertyInData(gen, data, property, ownProperties) {
      const cond = (0, codegen_1._)`${data}${(0, codegen_1.getProperty)(property)} === undefined`;
      return ownProperties ? (0, codegen_1.or)(cond, (0, codegen_1.not)(isOwnProperty(gen, data, property))) : cond;
    }
    exports2.noPropertyInData = noPropertyInData;
    function allSchemaProperties(schemaMap) {
      return schemaMap ? Object.keys(schemaMap).filter((p) => p !== "__proto__") : [];
    }
    exports2.allSchemaProperties = allSchemaProperties;
    function schemaProperties(it, schemaMap) {
      return allSchemaProperties(schemaMap).filter((p) => !(0, util_1.alwaysValidSchema)(it, schemaMap[p]));
    }
    exports2.schemaProperties = schemaProperties;
    function callValidateCode({ schemaCode, data, it: { gen, topSchemaRef, schemaPath, errorPath }, it }, func, context, passSchema) {
      const dataAndSchema = passSchema ? (0, codegen_1._)`${schemaCode}, ${data}, ${topSchemaRef}${schemaPath}` : data;
      const valCxt = [
        [names_1.default.instancePath, (0, codegen_1.strConcat)(names_1.default.instancePath, errorPath)],
        [names_1.default.parentData, it.parentData],
        [names_1.default.parentDataProperty, it.parentDataProperty],
        [names_1.default.rootData, names_1.default.rootData]
      ];
      if (it.opts.dynamicRef)
        valCxt.push([names_1.default.dynamicAnchors, names_1.default.dynamicAnchors]);
      const args = (0, codegen_1._)`${dataAndSchema}, ${gen.object(...valCxt)}`;
      return context !== codegen_1.nil ? (0, codegen_1._)`${func}.call(${context}, ${args})` : (0, codegen_1._)`${func}(${args})`;
    }
    exports2.callValidateCode = callValidateCode;
    var newRegExp = (0, codegen_1._)`new RegExp`;
    function usePattern({ gen, it: { opts } }, pattern) {
      const u = opts.unicodeRegExp ? "u" : "";
      const { regExp } = opts.code;
      const rx = regExp(pattern, u);
      return gen.scopeValue("pattern", {
        key: rx.toString(),
        ref: rx,
        code: (0, codegen_1._)`${regExp.code === "new RegExp" ? newRegExp : (0, util_2.useFunc)(gen, regExp)}(${pattern}, ${u})`
      });
    }
    exports2.usePattern = usePattern;
    function validateArray(cxt) {
      const { gen, data, keyword, it } = cxt;
      const valid = gen.name("valid");
      if (it.allErrors) {
        const validArr = gen.let("valid", true);
        validateItems(() => gen.assign(validArr, false));
        return validArr;
      }
      gen.var(valid, true);
      validateItems(() => gen.break());
      return valid;
      function validateItems(notValid) {
        const len = gen.const("len", (0, codegen_1._)`${data}.length`);
        gen.forRange("i", 0, len, (i) => {
          cxt.subschema({
            keyword,
            dataProp: i,
            dataPropType: util_1.Type.Num
          }, valid);
          gen.if((0, codegen_1.not)(valid), notValid);
        });
      }
    }
    exports2.validateArray = validateArray;
    function validateUnion(cxt) {
      const { gen, schema, keyword, it } = cxt;
      if (!Array.isArray(schema))
        throw new Error("ajv implementation error");
      const alwaysValid = schema.some((sch) => (0, util_1.alwaysValidSchema)(it, sch));
      if (alwaysValid && !it.opts.unevaluated)
        return;
      const valid = gen.let("valid", false);
      const schValid = gen.name("_valid");
      gen.block(() => schema.forEach((_sch, i) => {
        const schCxt = cxt.subschema({
          keyword,
          schemaProp: i,
          compositeRule: true
        }, schValid);
        gen.assign(valid, (0, codegen_1._)`${valid} || ${schValid}`);
        const merged = cxt.mergeValidEvaluated(schCxt, schValid);
        if (!merged)
          gen.if((0, codegen_1.not)(valid));
      }));
      cxt.result(valid, () => cxt.reset(), () => cxt.error(true));
    }
    exports2.validateUnion = validateUnion;
  }
});

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/validate/keyword.js
var require_keyword = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/validate/keyword.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.validateKeywordUsage = exports2.validSchemaType = exports2.funcKeywordCode = exports2.macroKeywordCode = void 0;
    var codegen_1 = require_codegen();
    var names_1 = require_names();
    var code_1 = require_code2();
    var errors_1 = require_errors();
    function macroKeywordCode(cxt, def) {
      const { gen, keyword, schema, parentSchema, it } = cxt;
      const macroSchema = def.macro.call(it.self, schema, parentSchema, it);
      const schemaRef = useKeyword(gen, keyword, macroSchema);
      if (it.opts.validateSchema !== false)
        it.self.validateSchema(macroSchema, true);
      const valid = gen.name("valid");
      cxt.subschema({
        schema: macroSchema,
        schemaPath: codegen_1.nil,
        errSchemaPath: `${it.errSchemaPath}/${keyword}`,
        topSchemaRef: schemaRef,
        compositeRule: true
      }, valid);
      cxt.pass(valid, () => cxt.error(true));
    }
    exports2.macroKeywordCode = macroKeywordCode;
    function funcKeywordCode(cxt, def) {
      var _a;
      const { gen, keyword, schema, parentSchema, $data, it } = cxt;
      checkAsyncKeyword(it, def);
      const validate = !$data && def.compile ? def.compile.call(it.self, schema, parentSchema, it) : def.validate;
      const validateRef = useKeyword(gen, keyword, validate);
      const valid = gen.let("valid");
      cxt.block$data(valid, validateKeyword);
      cxt.ok((_a = def.valid) !== null && _a !== void 0 ? _a : valid);
      function validateKeyword() {
        if (def.errors === false) {
          assignValid();
          if (def.modifying)
            modifyData(cxt);
          reportErrs(() => cxt.error());
        } else {
          const ruleErrs = def.async ? validateAsync() : validateSync();
          if (def.modifying)
            modifyData(cxt);
          reportErrs(() => addErrs(cxt, ruleErrs));
        }
      }
      function validateAsync() {
        const ruleErrs = gen.let("ruleErrs", null);
        gen.try(() => assignValid((0, codegen_1._)`await `), (e) => gen.assign(valid, false).if((0, codegen_1._)`${e} instanceof ${it.ValidationError}`, () => gen.assign(ruleErrs, (0, codegen_1._)`${e}.errors`), () => gen.throw(e)));
        return ruleErrs;
      }
      function validateSync() {
        const validateErrs = (0, codegen_1._)`${validateRef}.errors`;
        gen.assign(validateErrs, null);
        assignValid(codegen_1.nil);
        return validateErrs;
      }
      function assignValid(_await = def.async ? (0, codegen_1._)`await ` : codegen_1.nil) {
        const passCxt = it.opts.passContext ? names_1.default.this : names_1.default.self;
        const passSchema = !("compile" in def && !$data || def.schema === false);
        gen.assign(valid, (0, codegen_1._)`${_await}${(0, code_1.callValidateCode)(cxt, validateRef, passCxt, passSchema)}`, def.modifying);
      }
      function reportErrs(errors) {
        var _a2;
        gen.if((0, codegen_1.not)((_a2 = def.valid) !== null && _a2 !== void 0 ? _a2 : valid), errors);
      }
    }
    exports2.funcKeywordCode = funcKeywordCode;
    function modifyData(cxt) {
      const { gen, data, it } = cxt;
      gen.if(it.parentData, () => gen.assign(data, (0, codegen_1._)`${it.parentData}[${it.parentDataProperty}]`));
    }
    function addErrs(cxt, errs) {
      const { gen } = cxt;
      gen.if((0, codegen_1._)`Array.isArray(${errs})`, () => {
        gen.assign(names_1.default.vErrors, (0, codegen_1._)`${names_1.default.vErrors} === null ? ${errs} : ${names_1.default.vErrors}.concat(${errs})`).assign(names_1.default.errors, (0, codegen_1._)`${names_1.default.vErrors}.length`);
        (0, errors_1.extendErrors)(cxt);
      }, () => cxt.error());
    }
    function checkAsyncKeyword({ schemaEnv }, def) {
      if (def.async && !schemaEnv.$async)
        throw new Error("async keyword in sync schema");
    }
    function useKeyword(gen, keyword, result) {
      if (result === void 0)
        throw new Error(`keyword "${keyword}" failed to compile`);
      return gen.scopeValue("keyword", typeof result == "function" ? { ref: result } : { ref: result, code: (0, codegen_1.stringify)(result) });
    }
    function validSchemaType(schema, schemaType, allowUndefined = false) {
      return !schemaType.length || schemaType.some((st) => st === "array" ? Array.isArray(schema) : st === "object" ? schema && typeof schema == "object" && !Array.isArray(schema) : typeof schema == st || allowUndefined && typeof schema == "undefined");
    }
    exports2.validSchemaType = validSchemaType;
    function validateKeywordUsage({ schema, opts, self, errSchemaPath }, def, keyword) {
      if (Array.isArray(def.keyword) ? !def.keyword.includes(keyword) : def.keyword !== keyword) {
        throw new Error("ajv implementation error");
      }
      const deps = def.dependencies;
      if (deps === null || deps === void 0 ? void 0 : deps.some((kwd) => !Object.prototype.hasOwnProperty.call(schema, kwd))) {
        throw new Error(`parent schema must have dependencies of ${keyword}: ${deps.join(",")}`);
      }
      if (def.validateSchema) {
        const valid = def.validateSchema(schema[keyword]);
        if (!valid) {
          const msg = `keyword "${keyword}" value is invalid at path "${errSchemaPath}": ` + self.errorsText(def.validateSchema.errors);
          if (opts.validateSchema === "log")
            self.logger.error(msg);
          else
            throw new Error(msg);
        }
      }
    }
    exports2.validateKeywordUsage = validateKeywordUsage;
  }
});

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/validate/subschema.js
var require_subschema = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/validate/subschema.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.extendSubschemaMode = exports2.extendSubschemaData = exports2.getSubschema = void 0;
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    function getSubschema(it, { keyword, schemaProp, schema, schemaPath, errSchemaPath, topSchemaRef }) {
      if (keyword !== void 0 && schema !== void 0) {
        throw new Error('both "keyword" and "schema" passed, only one allowed');
      }
      if (keyword !== void 0) {
        const sch = it.schema[keyword];
        return schemaProp === void 0 ? {
          schema: sch,
          schemaPath: (0, codegen_1._)`${it.schemaPath}${(0, codegen_1.getProperty)(keyword)}`,
          errSchemaPath: `${it.errSchemaPath}/${keyword}`
        } : {
          schema: sch[schemaProp],
          schemaPath: (0, codegen_1._)`${it.schemaPath}${(0, codegen_1.getProperty)(keyword)}${(0, codegen_1.getProperty)(schemaProp)}`,
          errSchemaPath: `${it.errSchemaPath}/${keyword}/${(0, util_1.escapeFragment)(schemaProp)}`
        };
      }
      if (schema !== void 0) {
        if (schemaPath === void 0 || errSchemaPath === void 0 || topSchemaRef === void 0) {
          throw new Error('"schemaPath", "errSchemaPath" and "topSchemaRef" are required with "schema"');
        }
        return {
          schema,
          schemaPath,
          topSchemaRef,
          errSchemaPath
        };
      }
      throw new Error('either "keyword" or "schema" must be passed');
    }
    exports2.getSubschema = getSubschema;
    function extendSubschemaData(subschema, it, { dataProp, dataPropType: dpType, data, dataTypes, propertyName }) {
      if (data !== void 0 && dataProp !== void 0) {
        throw new Error('both "data" and "dataProp" passed, only one allowed');
      }
      const { gen } = it;
      if (dataProp !== void 0) {
        const { errorPath, dataPathArr, opts } = it;
        const nextData = gen.let("data", (0, codegen_1._)`${it.data}${(0, codegen_1.getProperty)(dataProp)}`, true);
        dataContextProps(nextData);
        subschema.errorPath = (0, codegen_1.str)`${errorPath}${(0, util_1.getErrorPath)(dataProp, dpType, opts.jsPropertySyntax)}`;
        subschema.parentDataProperty = (0, codegen_1._)`${dataProp}`;
        subschema.dataPathArr = [...dataPathArr, subschema.parentDataProperty];
      }
      if (data !== void 0) {
        const nextData = data instanceof codegen_1.Name ? data : gen.let("data", data, true);
        dataContextProps(nextData);
        if (propertyName !== void 0)
          subschema.propertyName = propertyName;
      }
      if (dataTypes)
        subschema.dataTypes = dataTypes;
      function dataContextProps(_nextData) {
        subschema.data = _nextData;
        subschema.dataLevel = it.dataLevel + 1;
        subschema.dataTypes = [];
        it.definedProperties = /* @__PURE__ */ new Set();
        subschema.parentData = it.data;
        subschema.dataNames = [...it.dataNames, _nextData];
      }
    }
    exports2.extendSubschemaData = extendSubschemaData;
    function extendSubschemaMode(subschema, { jtdDiscriminator, jtdMetadata, compositeRule, createErrors, allErrors }) {
      if (compositeRule !== void 0)
        subschema.compositeRule = compositeRule;
      if (createErrors !== void 0)
        subschema.createErrors = createErrors;
      if (allErrors !== void 0)
        subschema.allErrors = allErrors;
      subschema.jtdDiscriminator = jtdDiscriminator;
      subschema.jtdMetadata = jtdMetadata;
    }
    exports2.extendSubschemaMode = extendSubschemaMode;
  }
});

// node_modules/.pnpm/fast-deep-equal@3.1.3/node_modules/fast-deep-equal/index.js
var require_fast_deep_equal = __commonJS({
  "node_modules/.pnpm/fast-deep-equal@3.1.3/node_modules/fast-deep-equal/index.js"(exports2, module2) {
    "use strict";
    module2.exports = function equal(a, b) {
      if (a === b) return true;
      if (a && b && typeof a == "object" && typeof b == "object") {
        if (a.constructor !== b.constructor) return false;
        var length, i, keys;
        if (Array.isArray(a)) {
          length = a.length;
          if (length != b.length) return false;
          for (i = length; i-- !== 0; )
            if (!equal(a[i], b[i])) return false;
          return true;
        }
        if (a.constructor === RegExp) return a.source === b.source && a.flags === b.flags;
        if (a.valueOf !== Object.prototype.valueOf) return a.valueOf() === b.valueOf();
        if (a.toString !== Object.prototype.toString) return a.toString() === b.toString();
        keys = Object.keys(a);
        length = keys.length;
        if (length !== Object.keys(b).length) return false;
        for (i = length; i-- !== 0; )
          if (!Object.prototype.hasOwnProperty.call(b, keys[i])) return false;
        for (i = length; i-- !== 0; ) {
          var key = keys[i];
          if (!equal(a[key], b[key])) return false;
        }
        return true;
      }
      return a !== a && b !== b;
    };
  }
});

// node_modules/.pnpm/json-schema-traverse@1.0.0/node_modules/json-schema-traverse/index.js
var require_json_schema_traverse = __commonJS({
  "node_modules/.pnpm/json-schema-traverse@1.0.0/node_modules/json-schema-traverse/index.js"(exports2, module2) {
    "use strict";
    var traverse = module2.exports = function(schema, opts, cb) {
      if (typeof opts == "function") {
        cb = opts;
        opts = {};
      }
      cb = opts.cb || cb;
      var pre = typeof cb == "function" ? cb : cb.pre || function() {
      };
      var post = cb.post || function() {
      };
      _traverse(opts, pre, post, schema, "", schema);
    };
    traverse.keywords = {
      additionalItems: true,
      items: true,
      contains: true,
      additionalProperties: true,
      propertyNames: true,
      not: true,
      if: true,
      then: true,
      else: true
    };
    traverse.arrayKeywords = {
      items: true,
      allOf: true,
      anyOf: true,
      oneOf: true
    };
    traverse.propsKeywords = {
      $defs: true,
      definitions: true,
      properties: true,
      patternProperties: true,
      dependencies: true
    };
    traverse.skipKeywords = {
      default: true,
      enum: true,
      const: true,
      required: true,
      maximum: true,
      minimum: true,
      exclusiveMaximum: true,
      exclusiveMinimum: true,
      multipleOf: true,
      maxLength: true,
      minLength: true,
      pattern: true,
      format: true,
      maxItems: true,
      minItems: true,
      uniqueItems: true,
      maxProperties: true,
      minProperties: true
    };
    function _traverse(opts, pre, post, schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex) {
      if (schema && typeof schema == "object" && !Array.isArray(schema)) {
        pre(schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex);
        for (var key in schema) {
          var sch = schema[key];
          if (Array.isArray(sch)) {
            if (key in traverse.arrayKeywords) {
              for (var i = 0; i < sch.length; i++)
                _traverse(opts, pre, post, sch[i], jsonPtr + "/" + key + "/" + i, rootSchema, jsonPtr, key, schema, i);
            }
          } else if (key in traverse.propsKeywords) {
            if (sch && typeof sch == "object") {
              for (var prop in sch)
                _traverse(opts, pre, post, sch[prop], jsonPtr + "/" + key + "/" + escapeJsonPtr(prop), rootSchema, jsonPtr, key, schema, prop);
            }
          } else if (key in traverse.keywords || opts.allKeys && !(key in traverse.skipKeywords)) {
            _traverse(opts, pre, post, sch, jsonPtr + "/" + key, rootSchema, jsonPtr, key, schema);
          }
        }
        post(schema, jsonPtr, rootSchema, parentJsonPtr, parentKeyword, parentSchema, keyIndex);
      }
    }
    function escapeJsonPtr(str) {
      return str.replace(/~/g, "~0").replace(/\//g, "~1");
    }
  }
});

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/resolve.js
var require_resolve = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/resolve.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.getSchemaRefs = exports2.resolveUrl = exports2.normalizeId = exports2._getFullPath = exports2.getFullPath = exports2.inlineRef = void 0;
    var util_1 = require_util();
    var equal = require_fast_deep_equal();
    var traverse = require_json_schema_traverse();
    var SIMPLE_INLINED = /* @__PURE__ */ new Set([
      "type",
      "format",
      "pattern",
      "maxLength",
      "minLength",
      "maxProperties",
      "minProperties",
      "maxItems",
      "minItems",
      "maximum",
      "minimum",
      "uniqueItems",
      "multipleOf",
      "required",
      "enum",
      "const"
    ]);
    function inlineRef(schema, limit = true) {
      if (typeof schema == "boolean")
        return true;
      if (limit === true)
        return !hasRef(schema);
      if (!limit)
        return false;
      return countKeys(schema) <= limit;
    }
    exports2.inlineRef = inlineRef;
    var REF_KEYWORDS = /* @__PURE__ */ new Set([
      "$ref",
      "$recursiveRef",
      "$recursiveAnchor",
      "$dynamicRef",
      "$dynamicAnchor"
    ]);
    function hasRef(schema) {
      for (const key in schema) {
        if (REF_KEYWORDS.has(key))
          return true;
        const sch = schema[key];
        if (Array.isArray(sch) && sch.some(hasRef))
          return true;
        if (typeof sch == "object" && hasRef(sch))
          return true;
      }
      return false;
    }
    function countKeys(schema) {
      let count = 0;
      for (const key in schema) {
        if (key === "$ref")
          return Infinity;
        count++;
        if (SIMPLE_INLINED.has(key))
          continue;
        if (typeof schema[key] == "object") {
          (0, util_1.eachItem)(schema[key], (sch) => count += countKeys(sch));
        }
        if (count === Infinity)
          return Infinity;
      }
      return count;
    }
    function getFullPath(resolver, id = "", normalize) {
      if (normalize !== false)
        id = normalizeId(id);
      const p = resolver.parse(id);
      return _getFullPath(resolver, p);
    }
    exports2.getFullPath = getFullPath;
    function _getFullPath(resolver, p) {
      const serialized = resolver.serialize(p);
      return serialized.split("#")[0] + "#";
    }
    exports2._getFullPath = _getFullPath;
    var TRAILING_SLASH_HASH = /#\/?$/;
    function normalizeId(id) {
      return id ? id.replace(TRAILING_SLASH_HASH, "") : "";
    }
    exports2.normalizeId = normalizeId;
    function resolveUrl(resolver, baseId, id) {
      id = normalizeId(id);
      return resolver.resolve(baseId, id);
    }
    exports2.resolveUrl = resolveUrl;
    var ANCHOR = /^[a-z_][-a-z0-9._]*$/i;
    function getSchemaRefs(schema, baseId) {
      if (typeof schema == "boolean")
        return {};
      const { schemaId, uriResolver } = this.opts;
      const schId = normalizeId(schema[schemaId] || baseId);
      const baseIds = { "": schId };
      const pathPrefix = getFullPath(uriResolver, schId, false);
      const localRefs = {};
      const schemaRefs = /* @__PURE__ */ new Set();
      traverse(schema, { allKeys: true }, (sch, jsonPtr, _, parentJsonPtr) => {
        if (parentJsonPtr === void 0)
          return;
        const fullPath = pathPrefix + jsonPtr;
        let innerBaseId = baseIds[parentJsonPtr];
        if (typeof sch[schemaId] == "string")
          innerBaseId = addRef.call(this, sch[schemaId]);
        addAnchor.call(this, sch.$anchor);
        addAnchor.call(this, sch.$dynamicAnchor);
        baseIds[jsonPtr] = innerBaseId;
        function addRef(ref) {
          const _resolve = this.opts.uriResolver.resolve;
          ref = normalizeId(innerBaseId ? _resolve(innerBaseId, ref) : ref);
          if (schemaRefs.has(ref))
            throw ambiguos(ref);
          schemaRefs.add(ref);
          let schOrRef = this.refs[ref];
          if (typeof schOrRef == "string")
            schOrRef = this.refs[schOrRef];
          if (typeof schOrRef == "object") {
            checkAmbiguosRef(sch, schOrRef.schema, ref);
          } else if (ref !== normalizeId(fullPath)) {
            if (ref[0] === "#") {
              checkAmbiguosRef(sch, localRefs[ref], ref);
              localRefs[ref] = sch;
            } else {
              this.refs[ref] = fullPath;
            }
          }
          return ref;
        }
        function addAnchor(anchor) {
          if (typeof anchor == "string") {
            if (!ANCHOR.test(anchor))
              throw new Error(`invalid anchor "${anchor}"`);
            addRef.call(this, `#${anchor}`);
          }
        }
      });
      return localRefs;
      function checkAmbiguosRef(sch1, sch2, ref) {
        if (sch2 !== void 0 && !equal(sch1, sch2))
          throw ambiguos(ref);
      }
      function ambiguos(ref) {
        return new Error(`reference "${ref}" resolves to more than one schema`);
      }
    }
    exports2.getSchemaRefs = getSchemaRefs;
  }
});

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/validate/index.js
var require_validate = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/validate/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.getData = exports2.KeywordCxt = exports2.validateFunctionCode = void 0;
    var boolSchema_1 = require_boolSchema();
    var dataType_1 = require_dataType();
    var applicability_1 = require_applicability();
    var dataType_2 = require_dataType();
    var defaults_1 = require_defaults();
    var keyword_1 = require_keyword();
    var subschema_1 = require_subschema();
    var codegen_1 = require_codegen();
    var names_1 = require_names();
    var resolve_1 = require_resolve();
    var util_1 = require_util();
    var errors_1 = require_errors();
    function validateFunctionCode(it) {
      if (isSchemaObj(it)) {
        checkKeywords(it);
        if (schemaCxtHasRules(it)) {
          topSchemaObjCode(it);
          return;
        }
      }
      validateFunction(it, () => (0, boolSchema_1.topBoolOrEmptySchema)(it));
    }
    exports2.validateFunctionCode = validateFunctionCode;
    function validateFunction({ gen, validateName, schema, schemaEnv, opts }, body) {
      if (opts.code.es5) {
        gen.func(validateName, (0, codegen_1._)`${names_1.default.data}, ${names_1.default.valCxt}`, schemaEnv.$async, () => {
          gen.code((0, codegen_1._)`"use strict"; ${funcSourceUrl(schema, opts)}`);
          destructureValCxtES5(gen, opts);
          gen.code(body);
        });
      } else {
        gen.func(validateName, (0, codegen_1._)`${names_1.default.data}, ${destructureValCxt(opts)}`, schemaEnv.$async, () => gen.code(funcSourceUrl(schema, opts)).code(body));
      }
    }
    function destructureValCxt(opts) {
      return (0, codegen_1._)`{${names_1.default.instancePath}="", ${names_1.default.parentData}, ${names_1.default.parentDataProperty}, ${names_1.default.rootData}=${names_1.default.data}${opts.dynamicRef ? (0, codegen_1._)`, ${names_1.default.dynamicAnchors}={}` : codegen_1.nil}}={}`;
    }
    function destructureValCxtES5(gen, opts) {
      gen.if(names_1.default.valCxt, () => {
        gen.var(names_1.default.instancePath, (0, codegen_1._)`${names_1.default.valCxt}.${names_1.default.instancePath}`);
        gen.var(names_1.default.parentData, (0, codegen_1._)`${names_1.default.valCxt}.${names_1.default.parentData}`);
        gen.var(names_1.default.parentDataProperty, (0, codegen_1._)`${names_1.default.valCxt}.${names_1.default.parentDataProperty}`);
        gen.var(names_1.default.rootData, (0, codegen_1._)`${names_1.default.valCxt}.${names_1.default.rootData}`);
        if (opts.dynamicRef)
          gen.var(names_1.default.dynamicAnchors, (0, codegen_1._)`${names_1.default.valCxt}.${names_1.default.dynamicAnchors}`);
      }, () => {
        gen.var(names_1.default.instancePath, (0, codegen_1._)`""`);
        gen.var(names_1.default.parentData, (0, codegen_1._)`undefined`);
        gen.var(names_1.default.parentDataProperty, (0, codegen_1._)`undefined`);
        gen.var(names_1.default.rootData, names_1.default.data);
        if (opts.dynamicRef)
          gen.var(names_1.default.dynamicAnchors, (0, codegen_1._)`{}`);
      });
    }
    function topSchemaObjCode(it) {
      const { schema, opts, gen } = it;
      validateFunction(it, () => {
        if (opts.$comment && schema.$comment)
          commentKeyword(it);
        checkNoDefault(it);
        gen.let(names_1.default.vErrors, null);
        gen.let(names_1.default.errors, 0);
        if (opts.unevaluated)
          resetEvaluated(it);
        typeAndKeywords(it);
        returnResults(it);
      });
      return;
    }
    function resetEvaluated(it) {
      const { gen, validateName } = it;
      it.evaluated = gen.const("evaluated", (0, codegen_1._)`${validateName}.evaluated`);
      gen.if((0, codegen_1._)`${it.evaluated}.dynamicProps`, () => gen.assign((0, codegen_1._)`${it.evaluated}.props`, (0, codegen_1._)`undefined`));
      gen.if((0, codegen_1._)`${it.evaluated}.dynamicItems`, () => gen.assign((0, codegen_1._)`${it.evaluated}.items`, (0, codegen_1._)`undefined`));
    }
    function funcSourceUrl(schema, opts) {
      const schId = typeof schema == "object" && schema[opts.schemaId];
      return schId && (opts.code.source || opts.code.process) ? (0, codegen_1._)`/*# sourceURL=${schId} */` : codegen_1.nil;
    }
    function subschemaCode(it, valid) {
      if (isSchemaObj(it)) {
        checkKeywords(it);
        if (schemaCxtHasRules(it)) {
          subSchemaObjCode(it, valid);
          return;
        }
      }
      (0, boolSchema_1.boolOrEmptySchema)(it, valid);
    }
    function schemaCxtHasRules({ schema, self }) {
      if (typeof schema == "boolean")
        return !schema;
      for (const key in schema)
        if (self.RULES.all[key])
          return true;
      return false;
    }
    function isSchemaObj(it) {
      return typeof it.schema != "boolean";
    }
    function subSchemaObjCode(it, valid) {
      const { schema, gen, opts } = it;
      if (opts.$comment && schema.$comment)
        commentKeyword(it);
      updateContext(it);
      checkAsyncSchema(it);
      const errsCount = gen.const("_errs", names_1.default.errors);
      typeAndKeywords(it, errsCount);
      gen.var(valid, (0, codegen_1._)`${errsCount} === ${names_1.default.errors}`);
    }
    function checkKeywords(it) {
      (0, util_1.checkUnknownRules)(it);
      checkRefsAndKeywords(it);
    }
    function typeAndKeywords(it, errsCount) {
      if (it.opts.jtd)
        return schemaKeywords(it, [], false, errsCount);
      const types2 = (0, dataType_1.getSchemaTypes)(it.schema);
      const checkedTypes = (0, dataType_1.coerceAndCheckDataType)(it, types2);
      schemaKeywords(it, types2, !checkedTypes, errsCount);
    }
    function checkRefsAndKeywords(it) {
      const { schema, errSchemaPath, opts, self } = it;
      if (schema.$ref && opts.ignoreKeywordsWithRef && (0, util_1.schemaHasRulesButRef)(schema, self.RULES)) {
        self.logger.warn(`$ref: keywords ignored in schema at path "${errSchemaPath}"`);
      }
    }
    function checkNoDefault(it) {
      const { schema, opts } = it;
      if (schema.default !== void 0 && opts.useDefaults && opts.strictSchema) {
        (0, util_1.checkStrictMode)(it, "default is ignored in the schema root");
      }
    }
    function updateContext(it) {
      const schId = it.schema[it.opts.schemaId];
      if (schId)
        it.baseId = (0, resolve_1.resolveUrl)(it.opts.uriResolver, it.baseId, schId);
    }
    function checkAsyncSchema(it) {
      if (it.schema.$async && !it.schemaEnv.$async)
        throw new Error("async schema in sync schema");
    }
    function commentKeyword({ gen, schemaEnv, schema, errSchemaPath, opts }) {
      const msg = schema.$comment;
      if (opts.$comment === true) {
        gen.code((0, codegen_1._)`${names_1.default.self}.logger.log(${msg})`);
      } else if (typeof opts.$comment == "function") {
        const schemaPath = (0, codegen_1.str)`${errSchemaPath}/$comment`;
        const rootName = gen.scopeValue("root", { ref: schemaEnv.root });
        gen.code((0, codegen_1._)`${names_1.default.self}.opts.$comment(${msg}, ${schemaPath}, ${rootName}.schema)`);
      }
    }
    function returnResults(it) {
      const { gen, schemaEnv, validateName, ValidationError, opts } = it;
      if (schemaEnv.$async) {
        gen.if((0, codegen_1._)`${names_1.default.errors} === 0`, () => gen.return(names_1.default.data), () => gen.throw((0, codegen_1._)`new ${ValidationError}(${names_1.default.vErrors})`));
      } else {
        gen.assign((0, codegen_1._)`${validateName}.errors`, names_1.default.vErrors);
        if (opts.unevaluated)
          assignEvaluated(it);
        gen.return((0, codegen_1._)`${names_1.default.errors} === 0`);
      }
    }
    function assignEvaluated({ gen, evaluated, props, items }) {
      if (props instanceof codegen_1.Name)
        gen.assign((0, codegen_1._)`${evaluated}.props`, props);
      if (items instanceof codegen_1.Name)
        gen.assign((0, codegen_1._)`${evaluated}.items`, items);
    }
    function schemaKeywords(it, types2, typeErrors, errsCount) {
      const { gen, schema, data, allErrors, opts, self } = it;
      const { RULES } = self;
      if (schema.$ref && (opts.ignoreKeywordsWithRef || !(0, util_1.schemaHasRulesButRef)(schema, RULES))) {
        gen.block(() => keywordCode(it, "$ref", RULES.all.$ref.definition));
        return;
      }
      if (!opts.jtd)
        checkStrictTypes(it, types2);
      gen.block(() => {
        for (const group of RULES.rules)
          groupKeywords(group);
        groupKeywords(RULES.post);
      });
      function groupKeywords(group) {
        if (!(0, applicability_1.shouldUseGroup)(schema, group))
          return;
        if (group.type) {
          gen.if((0, dataType_2.checkDataType)(group.type, data, opts.strictNumbers));
          iterateKeywords(it, group);
          if (types2.length === 1 && types2[0] === group.type && typeErrors) {
            gen.else();
            (0, dataType_2.reportTypeError)(it);
          }
          gen.endIf();
        } else {
          iterateKeywords(it, group);
        }
        if (!allErrors)
          gen.if((0, codegen_1._)`${names_1.default.errors} === ${errsCount || 0}`);
      }
    }
    function iterateKeywords(it, group) {
      const { gen, schema, opts: { useDefaults } } = it;
      if (useDefaults)
        (0, defaults_1.assignDefaults)(it, group.type);
      gen.block(() => {
        for (const rule of group.rules) {
          if ((0, applicability_1.shouldUseRule)(schema, rule)) {
            keywordCode(it, rule.keyword, rule.definition, group.type);
          }
        }
      });
    }
    function checkStrictTypes(it, types2) {
      if (it.schemaEnv.meta || !it.opts.strictTypes)
        return;
      checkContextTypes(it, types2);
      if (!it.opts.allowUnionTypes)
        checkMultipleTypes(it, types2);
      checkKeywordTypes(it, it.dataTypes);
    }
    function checkContextTypes(it, types2) {
      if (!types2.length)
        return;
      if (!it.dataTypes.length) {
        it.dataTypes = types2;
        return;
      }
      types2.forEach((t) => {
        if (!includesType(it.dataTypes, t)) {
          strictTypesError(it, `type "${t}" not allowed by context "${it.dataTypes.join(",")}"`);
        }
      });
      narrowSchemaTypes(it, types2);
    }
    function checkMultipleTypes(it, ts) {
      if (ts.length > 1 && !(ts.length === 2 && ts.includes("null"))) {
        strictTypesError(it, "use allowUnionTypes to allow union type keyword");
      }
    }
    function checkKeywordTypes(it, ts) {
      const rules = it.self.RULES.all;
      for (const keyword in rules) {
        const rule = rules[keyword];
        if (typeof rule == "object" && (0, applicability_1.shouldUseRule)(it.schema, rule)) {
          const { type } = rule.definition;
          if (type.length && !type.some((t) => hasApplicableType(ts, t))) {
            strictTypesError(it, `missing type "${type.join(",")}" for keyword "${keyword}"`);
          }
        }
      }
    }
    function hasApplicableType(schTs, kwdT) {
      return schTs.includes(kwdT) || kwdT === "number" && schTs.includes("integer");
    }
    function includesType(ts, t) {
      return ts.includes(t) || t === "integer" && ts.includes("number");
    }
    function narrowSchemaTypes(it, withTypes) {
      const ts = [];
      for (const t of it.dataTypes) {
        if (includesType(withTypes, t))
          ts.push(t);
        else if (withTypes.includes("integer") && t === "number")
          ts.push("integer");
      }
      it.dataTypes = ts;
    }
    function strictTypesError(it, msg) {
      const schemaPath = it.schemaEnv.baseId + it.errSchemaPath;
      msg += ` at "${schemaPath}" (strictTypes)`;
      (0, util_1.checkStrictMode)(it, msg, it.opts.strictTypes);
    }
    var KeywordCxt = class {
      constructor(it, def, keyword) {
        (0, keyword_1.validateKeywordUsage)(it, def, keyword);
        this.gen = it.gen;
        this.allErrors = it.allErrors;
        this.keyword = keyword;
        this.data = it.data;
        this.schema = it.schema[keyword];
        this.$data = def.$data && it.opts.$data && this.schema && this.schema.$data;
        this.schemaValue = (0, util_1.schemaRefOrVal)(it, this.schema, keyword, this.$data);
        this.schemaType = def.schemaType;
        this.parentSchema = it.schema;
        this.params = {};
        this.it = it;
        this.def = def;
        if (this.$data) {
          this.schemaCode = it.gen.const("vSchema", getData(this.$data, it));
        } else {
          this.schemaCode = this.schemaValue;
          if (!(0, keyword_1.validSchemaType)(this.schema, def.schemaType, def.allowUndefined)) {
            throw new Error(`${keyword} value must be ${JSON.stringify(def.schemaType)}`);
          }
        }
        if ("code" in def ? def.trackErrors : def.errors !== false) {
          this.errsCount = it.gen.const("_errs", names_1.default.errors);
        }
      }
      result(condition, successAction, failAction) {
        this.failResult((0, codegen_1.not)(condition), successAction, failAction);
      }
      failResult(condition, successAction, failAction) {
        this.gen.if(condition);
        if (failAction)
          failAction();
        else
          this.error();
        if (successAction) {
          this.gen.else();
          successAction();
          if (this.allErrors)
            this.gen.endIf();
        } else {
          if (this.allErrors)
            this.gen.endIf();
          else
            this.gen.else();
        }
      }
      pass(condition, failAction) {
        this.failResult((0, codegen_1.not)(condition), void 0, failAction);
      }
      fail(condition) {
        if (condition === void 0) {
          this.error();
          if (!this.allErrors)
            this.gen.if(false);
          return;
        }
        this.gen.if(condition);
        this.error();
        if (this.allErrors)
          this.gen.endIf();
        else
          this.gen.else();
      }
      fail$data(condition) {
        if (!this.$data)
          return this.fail(condition);
        const { schemaCode } = this;
        this.fail((0, codegen_1._)`${schemaCode} !== undefined && (${(0, codegen_1.or)(this.invalid$data(), condition)})`);
      }
      error(append, errorParams, errorPaths) {
        if (errorParams) {
          this.setParams(errorParams);
          this._error(append, errorPaths);
          this.setParams({});
          return;
        }
        this._error(append, errorPaths);
      }
      _error(append, errorPaths) {
        ;
        (append ? errors_1.reportExtraError : errors_1.reportError)(this, this.def.error, errorPaths);
      }
      $dataError() {
        (0, errors_1.reportError)(this, this.def.$dataError || errors_1.keyword$DataError);
      }
      reset() {
        if (this.errsCount === void 0)
          throw new Error('add "trackErrors" to keyword definition');
        (0, errors_1.resetErrorsCount)(this.gen, this.errsCount);
      }
      ok(cond) {
        if (!this.allErrors)
          this.gen.if(cond);
      }
      setParams(obj, assign) {
        if (assign)
          Object.assign(this.params, obj);
        else
          this.params = obj;
      }
      block$data(valid, codeBlock, $dataValid = codegen_1.nil) {
        this.gen.block(() => {
          this.check$data(valid, $dataValid);
          codeBlock();
        });
      }
      check$data(valid = codegen_1.nil, $dataValid = codegen_1.nil) {
        if (!this.$data)
          return;
        const { gen, schemaCode, schemaType, def } = this;
        gen.if((0, codegen_1.or)((0, codegen_1._)`${schemaCode} === undefined`, $dataValid));
        if (valid !== codegen_1.nil)
          gen.assign(valid, true);
        if (schemaType.length || def.validateSchema) {
          gen.elseIf(this.invalid$data());
          this.$dataError();
          if (valid !== codegen_1.nil)
            gen.assign(valid, false);
        }
        gen.else();
      }
      invalid$data() {
        const { gen, schemaCode, schemaType, def, it } = this;
        return (0, codegen_1.or)(wrong$DataType(), invalid$DataSchema());
        function wrong$DataType() {
          if (schemaType.length) {
            if (!(schemaCode instanceof codegen_1.Name))
              throw new Error("ajv implementation error");
            const st = Array.isArray(schemaType) ? schemaType : [schemaType];
            return (0, codegen_1._)`${(0, dataType_2.checkDataTypes)(st, schemaCode, it.opts.strictNumbers, dataType_2.DataType.Wrong)}`;
          }
          return codegen_1.nil;
        }
        function invalid$DataSchema() {
          if (def.validateSchema) {
            const validateSchemaRef = gen.scopeValue("validate$data", { ref: def.validateSchema });
            return (0, codegen_1._)`!${validateSchemaRef}(${schemaCode})`;
          }
          return codegen_1.nil;
        }
      }
      subschema(appl, valid) {
        const subschema = (0, subschema_1.getSubschema)(this.it, appl);
        (0, subschema_1.extendSubschemaData)(subschema, this.it, appl);
        (0, subschema_1.extendSubschemaMode)(subschema, appl);
        const nextContext = { ...this.it, ...subschema, items: void 0, props: void 0 };
        subschemaCode(nextContext, valid);
        return nextContext;
      }
      mergeEvaluated(schemaCxt, toName) {
        const { it, gen } = this;
        if (!it.opts.unevaluated)
          return;
        if (it.props !== true && schemaCxt.props !== void 0) {
          it.props = util_1.mergeEvaluated.props(gen, schemaCxt.props, it.props, toName);
        }
        if (it.items !== true && schemaCxt.items !== void 0) {
          it.items = util_1.mergeEvaluated.items(gen, schemaCxt.items, it.items, toName);
        }
      }
      mergeValidEvaluated(schemaCxt, valid) {
        const { it, gen } = this;
        if (it.opts.unevaluated && (it.props !== true || it.items !== true)) {
          gen.if(valid, () => this.mergeEvaluated(schemaCxt, codegen_1.Name));
          return true;
        }
      }
    };
    exports2.KeywordCxt = KeywordCxt;
    function keywordCode(it, keyword, def, ruleType) {
      const cxt = new KeywordCxt(it, def, keyword);
      if ("code" in def) {
        def.code(cxt, ruleType);
      } else if (cxt.$data && def.validate) {
        (0, keyword_1.funcKeywordCode)(cxt, def);
      } else if ("macro" in def) {
        (0, keyword_1.macroKeywordCode)(cxt, def);
      } else if (def.compile || def.validate) {
        (0, keyword_1.funcKeywordCode)(cxt, def);
      }
    }
    var JSON_POINTER = /^\/(?:[^~]|~0|~1)*$/;
    var RELATIVE_JSON_POINTER = /^([0-9]+)(#|\/(?:[^~]|~0|~1)*)?$/;
    function getData($data, { dataLevel, dataNames, dataPathArr }) {
      let jsonPointer;
      let data;
      if ($data === "")
        return names_1.default.rootData;
      if ($data[0] === "/") {
        if (!JSON_POINTER.test($data))
          throw new Error(`Invalid JSON-pointer: ${$data}`);
        jsonPointer = $data;
        data = names_1.default.rootData;
      } else {
        const matches = RELATIVE_JSON_POINTER.exec($data);
        if (!matches)
          throw new Error(`Invalid JSON-pointer: ${$data}`);
        const up = +matches[1];
        jsonPointer = matches[2];
        if (jsonPointer === "#") {
          if (up >= dataLevel)
            throw new Error(errorMsg("property/index", up));
          return dataPathArr[dataLevel - up];
        }
        if (up > dataLevel)
          throw new Error(errorMsg("data", up));
        data = dataNames[dataLevel - up];
        if (!jsonPointer)
          return data;
      }
      let expr = data;
      const segments = jsonPointer.split("/");
      for (const segment of segments) {
        if (segment) {
          data = (0, codegen_1._)`${data}${(0, codegen_1.getProperty)((0, util_1.unescapeJsonPointer)(segment))}`;
          expr = (0, codegen_1._)`${expr} && ${data}`;
        }
      }
      return expr;
      function errorMsg(pointerType, up) {
        return `Cannot access ${pointerType} ${up} levels up, current level is ${dataLevel}`;
      }
    }
    exports2.getData = getData;
  }
});

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/runtime/validation_error.js
var require_validation_error = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/runtime/validation_error.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var ValidationError = class extends Error {
      constructor(errors) {
        super("validation failed");
        this.errors = errors;
        this.ajv = this.validation = true;
      }
    };
    exports2.default = ValidationError;
  }
});

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/ref_error.js
var require_ref_error = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/ref_error.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var resolve_1 = require_resolve();
    var MissingRefError = class extends Error {
      constructor(resolver, baseId, ref, msg) {
        super(msg || `can't resolve reference ${ref} from id ${baseId}`);
        this.missingRef = (0, resolve_1.resolveUrl)(resolver, baseId, ref);
        this.missingSchema = (0, resolve_1.normalizeId)((0, resolve_1.getFullPath)(resolver, this.missingRef));
      }
    };
    exports2.default = MissingRefError;
  }
});

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/index.js
var require_compile = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/compile/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.resolveSchema = exports2.getCompilingSchema = exports2.resolveRef = exports2.compileSchema = exports2.SchemaEnv = void 0;
    var codegen_1 = require_codegen();
    var validation_error_1 = require_validation_error();
    var names_1 = require_names();
    var resolve_1 = require_resolve();
    var util_1 = require_util();
    var validate_1 = require_validate();
    var SchemaEnv = class {
      constructor(env) {
        var _a;
        this.refs = {};
        this.dynamicAnchors = {};
        let schema;
        if (typeof env.schema == "object")
          schema = env.schema;
        this.schema = env.schema;
        this.schemaId = env.schemaId;
        this.root = env.root || this;
        this.baseId = (_a = env.baseId) !== null && _a !== void 0 ? _a : (0, resolve_1.normalizeId)(schema === null || schema === void 0 ? void 0 : schema[env.schemaId || "$id"]);
        this.schemaPath = env.schemaPath;
        this.localRefs = env.localRefs;
        this.meta = env.meta;
        this.$async = schema === null || schema === void 0 ? void 0 : schema.$async;
        this.refs = {};
      }
    };
    exports2.SchemaEnv = SchemaEnv;
    function compileSchema(sch) {
      const _sch = getCompilingSchema.call(this, sch);
      if (_sch)
        return _sch;
      const rootId = (0, resolve_1.getFullPath)(this.opts.uriResolver, sch.root.baseId);
      const { es5, lines } = this.opts.code;
      const { ownProperties } = this.opts;
      const gen = new codegen_1.CodeGen(this.scope, { es5, lines, ownProperties });
      let _ValidationError;
      if (sch.$async) {
        _ValidationError = gen.scopeValue("Error", {
          ref: validation_error_1.default,
          code: (0, codegen_1._)`require("ajv/dist/runtime/validation_error").default`
        });
      }
      const validateName = gen.scopeName("validate");
      sch.validateName = validateName;
      const schemaCxt = {
        gen,
        allErrors: this.opts.allErrors,
        data: names_1.default.data,
        parentData: names_1.default.parentData,
        parentDataProperty: names_1.default.parentDataProperty,
        dataNames: [names_1.default.data],
        dataPathArr: [codegen_1.nil],
        // TODO can its length be used as dataLevel if nil is removed?
        dataLevel: 0,
        dataTypes: [],
        definedProperties: /* @__PURE__ */ new Set(),
        topSchemaRef: gen.scopeValue("schema", this.opts.code.source === true ? { ref: sch.schema, code: (0, codegen_1.stringify)(sch.schema) } : { ref: sch.schema }),
        validateName,
        ValidationError: _ValidationError,
        schema: sch.schema,
        schemaEnv: sch,
        rootId,
        baseId: sch.baseId || rootId,
        schemaPath: codegen_1.nil,
        errSchemaPath: sch.schemaPath || (this.opts.jtd ? "" : "#"),
        errorPath: (0, codegen_1._)`""`,
        opts: this.opts,
        self: this
      };
      let sourceCode;
      try {
        this._compilations.add(sch);
        (0, validate_1.validateFunctionCode)(schemaCxt);
        gen.optimize(this.opts.code.optimize);
        const validateCode = gen.toString();
        sourceCode = `${gen.scopeRefs(names_1.default.scope)}return ${validateCode}`;
        if (this.opts.code.process)
          sourceCode = this.opts.code.process(sourceCode, sch);
        const makeValidate = new Function(`${names_1.default.self}`, `${names_1.default.scope}`, sourceCode);
        const validate = makeValidate(this, this.scope.get());
        this.scope.value(validateName, { ref: validate });
        validate.errors = null;
        validate.schema = sch.schema;
        validate.schemaEnv = sch;
        if (sch.$async)
          validate.$async = true;
        if (this.opts.code.source === true) {
          validate.source = { validateName, validateCode, scopeValues: gen._values };
        }
        if (this.opts.unevaluated) {
          const { props, items } = schemaCxt;
          validate.evaluated = {
            props: props instanceof codegen_1.Name ? void 0 : props,
            items: items instanceof codegen_1.Name ? void 0 : items,
            dynamicProps: props instanceof codegen_1.Name,
            dynamicItems: items instanceof codegen_1.Name
          };
          if (validate.source)
            validate.source.evaluated = (0, codegen_1.stringify)(validate.evaluated);
        }
        sch.validate = validate;
        return sch;
      } catch (e) {
        delete sch.validate;
        delete sch.validateName;
        if (sourceCode)
          this.logger.error("Error compiling schema, function code:", sourceCode);
        throw e;
      } finally {
        this._compilations.delete(sch);
      }
    }
    exports2.compileSchema = compileSchema;
    function resolveRef(root, baseId, ref) {
      var _a;
      ref = (0, resolve_1.resolveUrl)(this.opts.uriResolver, baseId, ref);
      const schOrFunc = root.refs[ref];
      if (schOrFunc)
        return schOrFunc;
      let _sch = resolve.call(this, root, ref);
      if (_sch === void 0) {
        const schema = (_a = root.localRefs) === null || _a === void 0 ? void 0 : _a[ref];
        const { schemaId } = this.opts;
        if (schema)
          _sch = new SchemaEnv({ schema, schemaId, root, baseId });
      }
      if (_sch === void 0)
        return;
      return root.refs[ref] = inlineOrCompile.call(this, _sch);
    }
    exports2.resolveRef = resolveRef;
    function inlineOrCompile(sch) {
      if ((0, resolve_1.inlineRef)(sch.schema, this.opts.inlineRefs))
        return sch.schema;
      return sch.validate ? sch : compileSchema.call(this, sch);
    }
    function getCompilingSchema(schEnv) {
      for (const sch of this._compilations) {
        if (sameSchemaEnv(sch, schEnv))
          return sch;
      }
    }
    exports2.getCompilingSchema = getCompilingSchema;
    function sameSchemaEnv(s1, s2) {
      return s1.schema === s2.schema && s1.root === s2.root && s1.baseId === s2.baseId;
    }
    function resolve(root, ref) {
      let sch;
      while (typeof (sch = this.refs[ref]) == "string")
        ref = sch;
      return sch || this.schemas[ref] || resolveSchema.call(this, root, ref);
    }
    function resolveSchema(root, ref) {
      const p = this.opts.uriResolver.parse(ref);
      const refPath = (0, resolve_1._getFullPath)(this.opts.uriResolver, p);
      let baseId = (0, resolve_1.getFullPath)(this.opts.uriResolver, root.baseId, void 0);
      if (Object.keys(root.schema).length > 0 && refPath === baseId) {
        return getJsonPointer.call(this, p, root);
      }
      const id = (0, resolve_1.normalizeId)(refPath);
      const schOrRef = this.refs[id] || this.schemas[id];
      if (typeof schOrRef == "string") {
        const sch = resolveSchema.call(this, root, schOrRef);
        if (typeof (sch === null || sch === void 0 ? void 0 : sch.schema) !== "object")
          return;
        return getJsonPointer.call(this, p, sch);
      }
      if (typeof (schOrRef === null || schOrRef === void 0 ? void 0 : schOrRef.schema) !== "object")
        return;
      if (!schOrRef.validate)
        compileSchema.call(this, schOrRef);
      if (id === (0, resolve_1.normalizeId)(ref)) {
        const { schema } = schOrRef;
        const { schemaId } = this.opts;
        const schId = schema[schemaId];
        if (schId)
          baseId = (0, resolve_1.resolveUrl)(this.opts.uriResolver, baseId, schId);
        return new SchemaEnv({ schema, schemaId, root, baseId });
      }
      return getJsonPointer.call(this, p, schOrRef);
    }
    exports2.resolveSchema = resolveSchema;
    var PREVENT_SCOPE_CHANGE = /* @__PURE__ */ new Set([
      "properties",
      "patternProperties",
      "enum",
      "dependencies",
      "definitions"
    ]);
    function getJsonPointer(parsedRef, { baseId, schema, root }) {
      var _a;
      if (((_a = parsedRef.fragment) === null || _a === void 0 ? void 0 : _a[0]) !== "/")
        return;
      for (const part of parsedRef.fragment.slice(1).split("/")) {
        if (typeof schema === "boolean")
          return;
        const partSchema = schema[(0, util_1.unescapeFragment)(part)];
        if (partSchema === void 0)
          return;
        schema = partSchema;
        const schId = typeof schema === "object" && schema[this.opts.schemaId];
        if (!PREVENT_SCOPE_CHANGE.has(part) && schId) {
          baseId = (0, resolve_1.resolveUrl)(this.opts.uriResolver, baseId, schId);
        }
      }
      let env;
      if (typeof schema != "boolean" && schema.$ref && !(0, util_1.schemaHasRulesButRef)(schema, this.RULES)) {
        const $ref = (0, resolve_1.resolveUrl)(this.opts.uriResolver, baseId, schema.$ref);
        env = resolveSchema.call(this, root, $ref);
      }
      const { schemaId } = this.opts;
      env = env || new SchemaEnv({ schema, schemaId, root, baseId });
      if (env.schema !== env.root.schema)
        return env;
      return void 0;
    }
  }
});

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/refs/data.json
var require_data = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/refs/data.json"(exports2, module2) {
    module2.exports = {
      $id: "https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#",
      description: "Meta-schema for $data reference (JSON AnySchema extension proposal)",
      type: "object",
      required: ["$data"],
      properties: {
        $data: {
          type: "string",
          anyOf: [{ format: "relative-json-pointer" }, { format: "json-pointer" }]
        }
      },
      additionalProperties: false
    };
  }
});

// node_modules/.pnpm/fast-uri@3.1.8/node_modules/fast-uri/lib/utils.js
var require_utils = __commonJS({
  "node_modules/.pnpm/fast-uri@3.1.8/node_modules/fast-uri/lib/utils.js"(exports2, module2) {
    "use strict";
    var isUUID = RegExp.prototype.test.bind(/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/iu);
    var isIPv4 = RegExp.prototype.test.bind(/^(?:(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)$/u);
    var isPort = RegExp.prototype.test.bind(/^\d*$/u);
    var isHexPair = RegExp.prototype.test.bind(/^[\da-f]{2}$/iu);
    var isUnreserved = RegExp.prototype.test.bind(/^[\da-z\-._~]$/iu);
    var isPathCharacter = RegExp.prototype.test.bind(/^[A-Za-z0-9\-._~!$&'()*+,;=:@/]$/u);
    var isQueryFragmentCharacter = RegExp.prototype.test.bind(/^[A-Za-z0-9\-._~!$&'()*+,;=:@/?]$/u);
    var isUserinfoCharacter = RegExp.prototype.test.bind(/^[A-Za-z0-9\-._~!$&'()*+,;=:]$/u);
    var BYTE_HEX = new Array(256);
    {
      const HEX_DIGITS = "0123456789ABCDEF";
      for (let i = 0; i < 256; i++) {
        BYTE_HEX[i] = "%" + HEX_DIGITS[i >> 4] + HEX_DIGITS[i & 15];
      }
    }
    function percentEncodeNonAscii(cp) {
      if (cp < 2048) {
        return BYTE_HEX[192 | cp >> 6] + BYTE_HEX[128 | cp & 63];
      }
      if (cp < 65536) {
        return BYTE_HEX[224 | cp >> 12] + BYTE_HEX[128 | cp >> 6 & 63] + BYTE_HEX[128 | cp & 63];
      }
      return BYTE_HEX[240 | cp >> 18] + BYTE_HEX[128 | cp >> 12 & 63] + BYTE_HEX[128 | cp >> 6 & 63] + BYTE_HEX[128 | cp & 63];
    }
    function stringArrayToHexStripped(input) {
      let acc = "";
      let code = 0;
      let i = 0;
      for (i = 0; i < input.length; i++) {
        code = input[i].charCodeAt(0);
        if (code === 48) {
          continue;
        }
        if (!(code >= 48 && code <= 57 || code >= 65 && code <= 70 || code >= 97 && code <= 102)) {
          return "";
        }
        acc += input[i];
        break;
      }
      for (i += 1; i < input.length; i++) {
        code = input[i].charCodeAt(0);
        if (!(code >= 48 && code <= 57 || code >= 65 && code <= 70 || code >= 97 && code <= 102)) {
          return "";
        }
        acc += input[i];
      }
      return acc;
    }
    var isHextet = RegExp.prototype.test.bind(/^[\dA-Fa-f]{1,4}$/);
    var isIPvFuture = RegExp.prototype.test.bind(/^[vV][\dA-Fa-f]+\.[A-Za-z\d\-._~!$&'()*+,;=:]+$/);
    var isZoneCharacter = RegExp.prototype.test.bind(/^[A-Za-z\d\-._~]$/);
    var nonSimpleDomain = RegExp.prototype.test.bind(/[^!"$&'()*+,\-.;=_`a-z{}~]/u);
    function isZoneIdentifier(zone) {
      if (zone.length === 0) return false;
      for (let i = 0; i < zone.length; i++) {
        if (isZoneCharacter(zone[i])) continue;
        if (zone[i] === "%" && i + 2 < zone.length && isHexPair(zone.slice(i + 1, i + 3))) {
          i += 2;
          continue;
        }
        return false;
      }
      return true;
    }
    function compressIPv6ZeroRun(hextets) {
      let bestStart = -1;
      let bestLength = 0;
      let runStart = -1;
      let runLength = 0;
      for (let i = 0; i < hextets.length; i++) {
        if (hextets[i] === "0") {
          if (runStart === -1) runStart = i;
          runLength++;
          if (runLength > bestLength) {
            bestLength = runLength;
            bestStart = runStart;
          }
        } else {
          runStart = -1;
          runLength = 0;
        }
      }
      if (bestLength < 2) return hextets.join(":");
      const head = hextets.slice(0, bestStart).join(":");
      const tail = hextets.slice(bestStart + bestLength).join(":");
      return head + "::" + tail;
    }
    function normalizeIPv6Address(input) {
      const compression = input.indexOf("::");
      if (compression !== -1 && input.indexOf("::", compression + 1) !== -1) return void 0;
      const left = compression === -1 ? input.split(":") : input.slice(0, compression).split(":");
      const right = compression === -1 ? [] : input.slice(compression + 2).split(":");
      if (compression !== -1) {
        if (left.length === 1 && left[0] === "") left.length = 0;
        if (right.length === 1 && right[0] === "") right.length = 0;
      }
      const parts = left.concat(right);
      let hextetCount = 0;
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (part === "") return void 0;
        if (part.indexOf(".") !== -1) {
          if (i !== parts.length - 1 || compression !== -1 && right.length === 0 || !isIPv4(part)) return void 0;
          hextetCount += 2;
          continue;
        }
        if (!isHextet(part)) return void 0;
        parts[i] = parseInt(part, 16).toString(16);
        hextetCount++;
      }
      if (compression === -1) {
        if (hextetCount !== 8) return void 0;
        return compressIPv6ZeroRun(parts);
      }
      if (hextetCount >= 8) return void 0;
      const expanded = parts.slice(0, left.length);
      for (let i = hextetCount; i < 8; i++) expanded.push("0");
      for (let i = left.length; i < parts.length; i++) expanded.push(parts[i]);
      return compressIPv6ZeroRun(expanded);
    }
    function normalizeIPv6(host) {
      const bracketed = host[0] === "[" && host[host.length - 1] === "]";
      const hasBracket = host[0] === "[" || host[host.length - 1] === "]";
      if (hasBracket && !bracketed) return { host, isIPV6: false, error: true };
      let input = bracketed ? host.slice(1, -1) : host;
      if (bracketed && isIPvFuture(input)) {
        input = input.toLowerCase();
        return { host: `[${input}]`, escapedHost: input, isIPV6: false, isIPVFuture: true };
      }
      if (findToken(input, ":") < 2) {
        return { host, isIPV6: false, error: bracketed };
      }
      let zoneIdentifier = "";
      const zoneSeparator = input.indexOf("%");
      if (zoneSeparator !== -1) {
        const separatorLength = input.slice(zoneSeparator, zoneSeparator + 3).toLowerCase() === "%25" ? 3 : 1;
        zoneIdentifier = input.slice(zoneSeparator + separatorLength);
        if (!isZoneIdentifier(zoneIdentifier)) return { host, isIPV6: false, error: true };
        input = input.slice(0, zoneSeparator);
      }
      const address = normalizeIPv6Address(input);
      if (address === void 0) return { host, isIPV6: false, error: true };
      return {
        host: address + (zoneIdentifier ? "%" + zoneIdentifier : ""),
        escapedHost: address + (zoneIdentifier ? "%25" + zoneIdentifier : ""),
        isIPV6: true
      };
    }
    function findToken(str, token) {
      let ind = 0;
      for (let i = 0; i < str.length; i++) {
        if (str[i] === token) ind++;
      }
      return ind;
    }
    function removeDotSegments(path) {
      let input = path;
      const output = [];
      let nextSlash = -1;
      let len = 0;
      while (len = input.length) {
        if (len === 1) {
          if (input === ".") {
            break;
          } else if (input === "/") {
            output.push("/");
            break;
          } else {
            output.push(input);
            break;
          }
        } else if (len === 2) {
          if (input[0] === ".") {
            if (input[1] === ".") {
              break;
            } else if (input[1] === "/") {
              input = input.slice(2);
              continue;
            }
          } else if (input[0] === "/") {
            if (input[1] === "." || input[1] === "/") {
              output.push("/");
              break;
            }
          }
        } else if (len === 3) {
          if (input === "/..") {
            if (output.length !== 0) {
              output.pop();
            }
            output.push("/");
            break;
          }
        }
        if (input[0] === ".") {
          if (input[1] === ".") {
            if (input[2] === "/") {
              input = input.slice(3);
              continue;
            }
          } else if (input[1] === "/") {
            input = input.slice(2);
            continue;
          }
        } else if (input[0] === "/") {
          if (input[1] === ".") {
            if (input[2] === "/") {
              input = input.slice(2);
              continue;
            } else if (input[2] === ".") {
              if (input[3] === "/") {
                input = input.slice(3);
                if (output.length !== 0) {
                  output.pop();
                }
                continue;
              }
            }
          }
        }
        if ((nextSlash = input.indexOf("/", 1)) === -1) {
          output.push(input);
          break;
        } else {
          output.push(input.slice(0, nextSlash));
          input = input.slice(nextSlash);
        }
      }
      return output.join("");
    }
    var HOST_DELIMS = { "@": "%40", "/": "%2F", "?": "%3F", "#": "%23", ":": "%3A" };
    var HOST_DELIM_RE = /[@/?#:]/g;
    var HOST_DELIM_NO_COLON_RE = /[@/?#]/g;
    function reescapeHostDelimiters(host, isIP) {
      const re = isIP ? HOST_DELIM_NO_COLON_RE : HOST_DELIM_RE;
      re.lastIndex = 0;
      return host.replace(re, (ch) => HOST_DELIMS[ch]);
    }
    function normalizePercentEncoding(input, decodeUnreserved = false) {
      if (input.indexOf("%") === -1) {
        return input;
      }
      let output = "";
      for (let i = 0; i < input.length; i++) {
        if (input[i] === "%" && i + 2 < input.length) {
          const hex = input.slice(i + 1, i + 3);
          if (isHexPair(hex)) {
            const normalizedHex = hex.toUpperCase();
            const decoded = String.fromCharCode(parseInt(normalizedHex, 16));
            if (decodeUnreserved && isUnreserved(decoded)) {
              output += decoded;
            } else {
              output += "%" + normalizedHex;
            }
            i += 2;
            continue;
          }
        }
        output += input[i];
      }
      return output;
    }
    function normalizePathEncoding(input) {
      let output = "";
      for (let i = 0; i < input.length; i++) {
        const ch = input[i];
        if (ch === "%" && i + 2 < input.length) {
          const hex = input.slice(i + 1, i + 3);
          if (isHexPair(hex)) {
            const normalizedHex = hex.toUpperCase();
            const decoded = String.fromCharCode(parseInt(normalizedHex, 16));
            if (decoded !== "." && isUnreserved(decoded)) {
              output += decoded;
            } else {
              output += "%" + normalizedHex;
            }
            i += 2;
            continue;
          }
        }
        if (isPathCharacter(ch)) {
          output += ch;
        } else {
          const code = input.charCodeAt(i);
          if (code < 128) {
            output += isEscapeSafe(code) ? ch : BYTE_HEX[code];
          } else if (code < 55296 || code > 57343) {
            output += percentEncodeNonAscii(code);
          } else if (code <= 56319 && i + 1 < input.length) {
            const low = input.charCodeAt(i + 1);
            if (low >= 56320 && low <= 57343) {
              output += percentEncodeNonAscii(65536 + (code - 55296 << 10) + (low - 56320));
              i++;
            } else {
              output += percentEncodeNonAscii(65533);
            }
          } else {
            output += percentEncodeNonAscii(65533);
          }
        }
      }
      return output;
    }
    function serializePathEncoding(input, pathNoScheme = false) {
      let output = "";
      let firstSegment = pathNoScheme && input[0] !== "/";
      for (let i = 0; i < input.length; i++) {
        const ch = input[i];
        if (ch === "%" && i + 2 < input.length) {
          const hex = input.slice(i + 1, i + 3);
          if (isHexPair(hex)) {
            output += "%" + hex.toUpperCase();
            i += 2;
            continue;
          }
        }
        if (ch === "/") {
          firstSegment = false;
        }
        if (isPathCharacter(ch) && (ch !== ":" || !firstSegment)) {
          output += ch;
        } else {
          const code = input.charCodeAt(i);
          if (code < 128) {
            output += BYTE_HEX[code];
          } else if (code < 55296 || code > 57343) {
            output += percentEncodeNonAscii(code);
          } else if (code <= 56319 && i + 1 < input.length) {
            const low = input.charCodeAt(i + 1);
            if (low >= 56320 && low <= 57343) {
              output += percentEncodeNonAscii(65536 + (code - 55296 << 10) + (low - 56320));
              i++;
            } else {
              output += percentEncodeNonAscii(65533);
            }
          } else {
            output += percentEncodeNonAscii(65533);
          }
        }
      }
      return output;
    }
    function encodeComponent(input, isAllowed) {
      let output = "";
      for (let i = 0; i < input.length; i++) {
        const ch = input[i];
        if (ch === "%" && i + 2 < input.length) {
          const hex = input.slice(i + 1, i + 3);
          if (isHexPair(hex)) {
            output += "%" + hex.toUpperCase();
            i += 2;
            continue;
          }
        }
        if (isAllowed(ch)) {
          output += ch;
        } else {
          const code = input.charCodeAt(i);
          if (code < 128) {
            output += BYTE_HEX[code];
          } else if (code < 55296 || code > 57343) {
            output += percentEncodeNonAscii(code);
          } else if (code <= 56319 && i + 1 < input.length) {
            const low = input.charCodeAt(i + 1);
            if (low >= 56320 && low <= 57343) {
              output += percentEncodeNonAscii(65536 + (code - 55296 << 10) + (low - 56320));
              i++;
            } else {
              output += percentEncodeNonAscii(65533);
            }
          } else {
            output += percentEncodeNonAscii(65533);
          }
        }
      }
      return output;
    }
    function encodeUserinfo(input) {
      return encodeComponent(input, isUserinfoCharacter);
    }
    function encodeQuery(input) {
      return encodeComponent(input, isQueryFragmentCharacter);
    }
    function encodeFragment(input) {
      return encodeComponent(input, isQueryFragmentCharacter);
    }
    function isEscapeSafe(cp) {
      return cp >= 48 && cp <= 57 || cp >= 65 && cp <= 90 || cp >= 97 && cp <= 122 || cp === 42 || cp === 43 || cp === 45 || cp === 46 || cp === 47 || cp === 64 || cp === 95;
    }
    function normalizeQueryFragmentEncoding(input) {
      let output = "";
      for (let i = 0; i < input.length; i++) {
        const ch = input[i];
        if (ch === "%" && i + 2 < input.length) {
          const hex = input.slice(i + 1, i + 3);
          if (isHexPair(hex)) {
            const normalizedHex = hex.toUpperCase();
            const decoded = String.fromCharCode(parseInt(normalizedHex, 16));
            if (isUnreserved(decoded)) {
              output += decoded;
            } else {
              output += "%" + normalizedHex;
            }
            i += 2;
            continue;
          }
        }
        if (isQueryFragmentCharacter(ch)) {
          output += ch;
        } else {
          const code = input.charCodeAt(i);
          if (code < 128) {
            output += isEscapeSafe(code) ? ch : BYTE_HEX[code];
          } else if (code < 55296 || code > 57343) {
            output += percentEncodeNonAscii(code);
          } else if (code <= 56319 && i + 1 < input.length) {
            const low = input.charCodeAt(i + 1);
            if (low >= 56320 && low <= 57343) {
              output += percentEncodeNonAscii(65536 + (code - 55296 << 10) + (low - 56320));
              i++;
            } else {
              output += percentEncodeNonAscii(65533);
            }
          } else {
            output += percentEncodeNonAscii(65533);
          }
        }
      }
      return output;
    }
    function escapePreservingEscapes(input) {
      let output = "";
      for (let i = 0; i < input.length; i++) {
        if (input[i] === "%" && i + 2 < input.length) {
          const hex = input.slice(i + 1, i + 3);
          if (isHexPair(hex)) {
            output += "%" + hex.toUpperCase();
            i += 2;
            continue;
          }
        }
        output += escape(input[i]);
      }
      return output;
    }
    function recomposeAuthority(component) {
      const uriTokens = [];
      if (component.userinfo !== void 0) {
        uriTokens.push(encodeUserinfo(component.userinfo));
        uriTokens.push("@");
      }
      if (component.host !== void 0) {
        let host = component.host;
        if (!isIPv4(host)) {
          let ipV6res = normalizeIPv6(host);
          if (ipV6res.isIPV6 !== true && ipV6res.isIPVFuture !== true) {
            host = normalizePercentEncoding(host, true);
            ipV6res = normalizeIPv6(host);
          }
          if (ipV6res.isIPV6 === true || ipV6res.isIPVFuture === true) {
            host = `[${ipV6res.escapedHost}]`;
          } else {
            host = reescapeHostDelimiters(host, false);
          }
        }
        uriTokens.push(host);
      }
      if (typeof component.port === "number" || typeof component.port === "string") {
        const port = String(component.port);
        if (!isPort(port)) {
          throw new TypeError("URI port is malformed.");
        }
        uriTokens.push(":");
        uriTokens.push(port);
      }
      return uriTokens.length ? uriTokens.join("") : void 0;
    }
    module2.exports = {
      nonSimpleDomain,
      recomposeAuthority,
      reescapeHostDelimiters,
      normalizePercentEncoding,
      normalizePathEncoding,
      serializePathEncoding,
      normalizeQueryFragmentEncoding,
      encodeUserinfo,
      encodeQuery,
      encodeFragment,
      escapePreservingEscapes,
      removeDotSegments,
      isIPv4,
      isUUID,
      normalizeIPv6,
      stringArrayToHexStripped
    };
  }
});

// node_modules/.pnpm/fast-uri@3.1.8/node_modules/fast-uri/lib/schemes.js
var require_schemes = __commonJS({
  "node_modules/.pnpm/fast-uri@3.1.8/node_modules/fast-uri/lib/schemes.js"(exports2, module2) {
    "use strict";
    var { isUUID } = require_utils();
    var URN_REG = /^([\da-z][\d\-a-z]{0,31}):((?:[\w!$'()*+,\-./:;=@]|%[\da-f]{2})+)$/iu;
    var supportedSchemeNames = (
      /** @type {const} */
      [
        "http",
        "https",
        "ws",
        "wss",
        "urn",
        "urn:uuid"
      ]
    );
    function isValidSchemeName(name) {
      return supportedSchemeNames.indexOf(
        /** @type {*} */
        name
      ) !== -1;
    }
    function wsIsSecure(wsComponent) {
      if (wsComponent.secure === true) {
        return true;
      } else if (wsComponent.secure === false) {
        return false;
      } else if (wsComponent.scheme) {
        return wsComponent.scheme.length === 3 && (wsComponent.scheme[0] === "w" || wsComponent.scheme[0] === "W") && (wsComponent.scheme[1] === "s" || wsComponent.scheme[1] === "S") && (wsComponent.scheme[2] === "s" || wsComponent.scheme[2] === "S");
      } else {
        return false;
      }
    }
    function httpParse(component) {
      if (!component.host) {
        component.error = component.error || "HTTP URIs must have a host.";
      }
      return component;
    }
    function httpSerialize(component) {
      const secure = String(component.scheme).toLowerCase() === "https";
      if (component.port === (secure ? 443 : 80) || component.port === "") {
        component.port = void 0;
      }
      if (!component.path) {
        component.path = "/";
      }
      return component;
    }
    function wsParse(wsComponent) {
      wsComponent.secure = wsIsSecure(wsComponent);
      wsComponent.resourceName = (wsComponent.path || "/") + (wsComponent.query ? "?" + wsComponent.query : "");
      wsComponent.path = void 0;
      wsComponent.query = void 0;
      return wsComponent;
    }
    function wsSerialize(wsComponent) {
      if (wsComponent.port === (wsIsSecure(wsComponent) ? 443 : 80) || wsComponent.port === "") {
        wsComponent.port = void 0;
      }
      if (typeof wsComponent.secure === "boolean") {
        wsComponent.scheme = wsComponent.secure ? "wss" : "ws";
        wsComponent.secure = void 0;
      }
      if (wsComponent.resourceName) {
        const queryIndex = wsComponent.resourceName.indexOf("?");
        const path = queryIndex === -1 ? wsComponent.resourceName : wsComponent.resourceName.slice(0, queryIndex);
        wsComponent.path = path && path !== "/" ? path : void 0;
        wsComponent.query = queryIndex === -1 ? void 0 : wsComponent.resourceName.slice(queryIndex + 1);
        wsComponent.resourceName = void 0;
      }
      wsComponent.fragment = void 0;
      return wsComponent;
    }
    function urnParse(urnComponent, options) {
      if (!urnComponent.path) {
        urnComponent.error = "URN can not be parsed";
        return urnComponent;
      }
      const matches = urnComponent.path.match(URN_REG);
      if (matches && matches[0] === urnComponent.path) {
        const scheme = options.scheme || urnComponent.scheme || "urn";
        urnComponent.nid = matches[1].toLowerCase();
        urnComponent.nss = matches[2];
        const urnScheme = `${scheme}:${options.nid || urnComponent.nid}`;
        const schemeHandler = getSchemeHandler(urnScheme);
        urnComponent.path = void 0;
        if (schemeHandler) {
          urnComponent = schemeHandler.parse(urnComponent, options);
        }
      } else {
        urnComponent.error = urnComponent.error || "URN can not be parsed.";
      }
      return urnComponent;
    }
    function urnSerialize(urnComponent, options) {
      if (urnComponent.nid === void 0) {
        throw new Error("URN without nid cannot be serialized");
      }
      const scheme = options.scheme || urnComponent.scheme || "urn";
      const nid = urnComponent.nid.toLowerCase();
      const urnScheme = `${scheme}:${options.nid || nid}`;
      const schemeHandler = getSchemeHandler(urnScheme);
      if (schemeHandler) {
        urnComponent = schemeHandler.serialize(urnComponent, options);
      }
      const uriComponent = urnComponent;
      const nss = urnComponent.nss;
      uriComponent.path = `${nid || options.nid}:${nss}`;
      options.skipEscape = true;
      return uriComponent;
    }
    function urnuuidParse(urnComponent, options) {
      const uuidComponent = urnComponent;
      uuidComponent.uuid = uuidComponent.nss;
      uuidComponent.nss = void 0;
      if (!options.tolerant && (!uuidComponent.uuid || !isUUID(uuidComponent.uuid))) {
        uuidComponent.error = uuidComponent.error || "UUID is not valid.";
      }
      return uuidComponent;
    }
    function urnuuidSerialize(uuidComponent) {
      const urnComponent = uuidComponent;
      urnComponent.nss = (uuidComponent.uuid || "").toLowerCase();
      return urnComponent;
    }
    var http = (
      /** @type {SchemeHandler} */
      {
        scheme: "http",
        domainHost: true,
        parse: httpParse,
        serialize: httpSerialize
      }
    );
    var https = (
      /** @type {SchemeHandler} */
      {
        scheme: "https",
        domainHost: http.domainHost,
        parse: httpParse,
        serialize: httpSerialize
      }
    );
    var ws = (
      /** @type {SchemeHandler} */
      {
        scheme: "ws",
        domainHost: true,
        parse: wsParse,
        serialize: wsSerialize
      }
    );
    var wss = (
      /** @type {SchemeHandler} */
      {
        scheme: "wss",
        domainHost: ws.domainHost,
        parse: ws.parse,
        serialize: ws.serialize
      }
    );
    var urn = (
      /** @type {SchemeHandler} */
      {
        scheme: "urn",
        parse: urnParse,
        serialize: urnSerialize,
        skipNormalize: true
      }
    );
    var urnuuid = (
      /** @type {SchemeHandler} */
      {
        scheme: "urn:uuid",
        parse: urnuuidParse,
        serialize: urnuuidSerialize,
        skipNormalize: true
      }
    );
    var SCHEMES = (
      /** @type {Record<SchemeName, SchemeHandler>} */
      {
        http,
        https,
        ws,
        wss,
        urn,
        "urn:uuid": urnuuid
      }
    );
    Object.setPrototypeOf(SCHEMES, null);
    function getSchemeHandler(scheme) {
      return scheme && (SCHEMES[
        /** @type {SchemeName} */
        scheme
      ] || SCHEMES[
        /** @type {SchemeName} */
        scheme.toLowerCase()
      ]) || void 0;
    }
    module2.exports = {
      wsIsSecure,
      SCHEMES,
      isValidSchemeName,
      getSchemeHandler
    };
  }
});

// node_modules/.pnpm/fast-uri@3.1.8/node_modules/fast-uri/index.js
var require_fast_uri = __commonJS({
  "node_modules/.pnpm/fast-uri@3.1.8/node_modules/fast-uri/index.js"(exports2, module2) {
    "use strict";
    var { normalizeIPv6, removeDotSegments, recomposeAuthority, normalizePercentEncoding, normalizePathEncoding, serializePathEncoding, normalizeQueryFragmentEncoding, encodeQuery, encodeFragment, reescapeHostDelimiters, isIPv4, nonSimpleDomain } = require_utils();
    var { SCHEMES, getSchemeHandler } = require_schemes();
    var VALID_SCHEME = /^[A-Za-z][A-Za-z0-9+.-]*$/u;
    var MALFORMED_SCHEME_ERROR = "URI scheme is malformed.";
    function decodeValidScheme(scheme) {
      const decodedScheme = unescape(String(scheme));
      if (!VALID_SCHEME.test(decodedScheme)) {
        throw new TypeError(MALFORMED_SCHEME_ERROR);
      }
      return decodedScheme;
    }
    function normalize(uri, options) {
      if (typeof uri === "string") {
        uri = /** @type {T} */
        normalizeString(uri, options);
      } else if (typeof uri === "object") {
        uri = /** @type {T} */
        parse(serialize(uri, options), options);
      }
      return uri;
    }
    function resolve(baseURI, relativeURI, options) {
      const schemelessOptions = options ? Object.assign({ scheme: "null" }, options) : { scheme: "null" };
      const {
        parsed: baseParsed,
        malformedAuthorityOrPort: baseMalformed,
        malformedPercentEncoding: baseMalformedPercentEncoding,
        malformedSchemeSpecific: baseMalformedSchemeSpecific,
        malformedHost: baseMalformedHost,
        malformedScheme: baseMalformedScheme
      } = parseWithStatus(baseURI, schemelessOptions);
      const {
        parsed: relativeParsed,
        malformedAuthorityOrPort: relativeMalformed,
        malformedPercentEncoding: relativeMalformedPercentEncoding,
        malformedSchemeSpecific: relativeMalformedSchemeSpecific,
        malformedHost: relativeMalformedHost,
        malformedScheme: relativeMalformedScheme
      } = parseWithStatus(relativeURI, schemelessOptions);
      if (baseMalformed || relativeMalformed || baseMalformedPercentEncoding || relativeMalformedPercentEncoding || baseMalformedSchemeSpecific || relativeMalformedSchemeSpecific || baseMalformedHost || relativeMalformedHost || baseMalformedScheme || relativeMalformedScheme) {
        throw new Error(baseParsed.error || relativeParsed.error || "URI is malformed.");
      }
      const resolved = resolveComponent(baseParsed, relativeParsed, schemelessOptions, true);
      const resolvedSchemeHandler = getSchemeHandler(options && options.scheme || resolved.scheme);
      const resolvedHost = resolved.host;
      const resolvedHostIsIP = resolvedHost !== void 0 && resolvedHost !== "" && (isIPv4(resolvedHost) || normalizeIPv6(resolvedHost).isIPV6);
      canonicalizeHost(resolved, options || {}, resolvedSchemeHandler, resolvedHostIsIP);
      const encodedASCIIHost = resolvedHost && resolvedHost.indexOf("%") !== -1 && !/\P{ASCII}/u.test(resolvedHost);
      if (resolved.error && !encodedASCIIHost) {
        throw new Error(resolved.error);
      }
      schemelessOptions.skipEscape = true;
      return serialize(resolved, schemelessOptions);
    }
    function resolveComponent(base, relative, options, skipNormalization) {
      const target = {};
      if (!skipNormalization) {
        base = parse(serialize(base, options), options);
        relative = parse(serialize(relative, options), options);
      }
      options = options || {};
      if (!options.tolerant && relative.scheme) {
        target.scheme = relative.scheme;
        target.userinfo = relative.userinfo;
        target.host = relative.host;
        target.port = relative.port;
        target.path = removeDotSegments(relative.path || "");
        target.query = relative.query;
      } else {
        if (relative.userinfo !== void 0 || relative.host !== void 0 || relative.port !== void 0) {
          target.userinfo = relative.userinfo;
          target.host = relative.host;
          target.port = relative.port;
          target.path = removeDotSegments(relative.path || "");
          target.query = relative.query;
        } else {
          if (!relative.path) {
            target.path = base.path;
            if (relative.query !== void 0) {
              target.query = relative.query;
            } else {
              target.query = base.query;
            }
          } else {
            if (relative.path[0] === "/") {
              target.path = removeDotSegments(relative.path);
            } else {
              if ((base.userinfo !== void 0 || base.host !== void 0 || base.port !== void 0) && !base.path) {
                target.path = "/" + relative.path;
              } else if (!base.path) {
                target.path = relative.path;
              } else {
                target.path = base.path.slice(0, base.path.lastIndexOf("/") + 1) + relative.path;
              }
              target.path = removeDotSegments(target.path);
            }
            target.query = relative.query;
          }
          target.userinfo = base.userinfo;
          target.host = base.host;
          target.port = base.port;
        }
        target.scheme = base.scheme;
      }
      target.fragment = relative.fragment;
      return target;
    }
    function equal(uriA, uriB, options) {
      const normalizedA = normalizeComparableURI(uriA, options);
      const normalizedB = normalizeComparableURI(uriB, options);
      return normalizedA !== void 0 && normalizedB !== void 0 && normalizedA === normalizedB;
    }
    function serialize(cmpts, opts) {
      const component = {
        host: cmpts.host,
        scheme: cmpts.scheme,
        userinfo: cmpts.userinfo,
        port: cmpts.port,
        path: cmpts.path,
        query: cmpts.query,
        nid: cmpts.nid,
        nss: cmpts.nss,
        uuid: cmpts.uuid,
        fragment: cmpts.fragment,
        reference: cmpts.reference,
        resourceName: cmpts.resourceName,
        secure: cmpts.secure,
        error: ""
      };
      const options = Object.assign({}, opts);
      const uriTokens = [];
      if (component.scheme) {
        component.scheme = decodeValidScheme(component.scheme);
      }
      const schemeHandler = getSchemeHandler(options.scheme || component.scheme);
      if (schemeHandler && schemeHandler.serialize) schemeHandler.serialize(component, options);
      const hasAuthority = component.userinfo !== void 0 || component.host !== void 0 || component.port !== void 0;
      const pathNoScheme = !options.skipEscape && component.scheme === void 0 && !hasAuthority;
      if (component.path !== void 0) {
        if (!options.skipEscape) {
          component.path = serializePathEncoding(component.path, pathNoScheme);
        } else {
          component.path = normalizePercentEncoding(component.path);
        }
      }
      if (options.reference !== "suffix" && component.scheme) {
        component.scheme = decodeValidScheme(component.scheme);
        uriTokens.push(component.scheme, ":");
      }
      const authority = recomposeAuthority(component);
      if (authority !== void 0) {
        if (options.reference !== "suffix") {
          uriTokens.push("//");
        }
        uriTokens.push(authority);
        if (component.path && component.path[0] !== "/") {
          uriTokens.push("/");
        }
      }
      if (component.path !== void 0) {
        let s = component.path;
        if (!options.absolutePath && (!schemeHandler || !schemeHandler.absolutePath)) {
          s = removeDotSegments(s);
        }
        if (pathNoScheme) {
          s = serializePathEncoding(s, true);
        }
        if (authority === void 0 && s[0] === "/" && s[1] === "/") {
          s = "/%2F" + s.slice(2);
        }
        uriTokens.push(s);
      }
      if (component.query !== void 0) {
        uriTokens.push("?", encodeQuery(component.query));
      }
      if (component.fragment !== void 0) {
        uriTokens.push("#", encodeFragment(component.fragment));
      }
      return uriTokens.join("");
    }
    var URI_PARSE = /^(?:([^#/:?]+):)?(?:\/\/((?:([^#/?@]*)@)?(\[[^#/?\]]+\]|[^#/:?]*)(?::(\d*))?))?([^#?]*)(?:\?([^#]*))?(?:#((?:.|[\n\r])*))?/u;
    var AUTHORITY_PREFIX = /^(?:[^#/:?]+:)?\/\/([^/?#]*)/;
    var AUTHORITY_INTRODUCER_REGION = /^(?:[^#/:?]+:)?([/\\\t\n\r]*)/;
    function getParseError(parsed, matches) {
      if (matches[2] !== void 0 && parsed.path && parsed.path[0] !== "/") {
        return 'URI path must start with "/" when authority is present.';
      }
      if (typeof parsed.port === "number" && (parsed.port < 0 || parsed.port > 65535)) {
        return "URI port is malformed.";
      }
      return void 0;
    }
    function hasMalformedPercentEncoding(component) {
      if (component === void 0) return false;
      let percent = component.indexOf("%");
      while (percent !== -1) {
        if (percent + 2 >= component.length || !/^[\da-f]{2}$/iu.test(component.slice(percent + 1, percent + 3))) {
          return true;
        }
        percent = component.indexOf("%", percent + 3);
      }
      return false;
    }
    function isIPLiteral(host) {
      return host[0] === "[" && host[host.length - 1] === "]";
    }
    function hasMalformedComponentPercentEncoding(matches) {
      const host = matches[4];
      return hasMalformedPercentEncoding(matches[3]) || host !== void 0 && !isIPLiteral(host) && hasMalformedPercentEncoding(host) || hasMalformedPercentEncoding(matches[6]) || hasMalformedPercentEncoding(matches[7]) || hasMalformedPercentEncoding(matches[8]);
    }
    function canonicalizeHost(parsed, options, schemeHandler, isIP) {
      if (!options.unicodeSupport && (!schemeHandler || !schemeHandler.unicodeSupport) && parsed.host && !isIPLiteral(parsed.host) && (options.domainHost || schemeHandler && schemeHandler.domainHost) && isIP === false && nonSimpleDomain(parsed.host)) {
        try {
          parsed.host = new URL("http://" + parsed.host).hostname;
        } catch (e) {
          parsed.error = parsed.error || "Host's domain name can not be converted to ASCII: " + e;
          return true;
        }
      }
      return false;
    }
    function parseWithStatus(uri, opts) {
      const options = Object.assign({}, opts);
      const parsed = {
        scheme: void 0,
        userinfo: void 0,
        host: "",
        port: void 0,
        path: "",
        query: void 0,
        fragment: void 0
      };
      let malformedAuthorityOrPort = false;
      let malformedPercentEncoding = false;
      let malformedSchemeSpecific = false;
      let malformedHost = false;
      let malformedIPLiteral = false;
      let malformedScheme = false;
      let isIP = false;
      if (options.reference === "suffix") {
        if (options.scheme) {
          uri = options.scheme + ":" + uri;
        } else {
          uri = "//" + uri;
        }
      }
      const authorityMatch = uri.match(AUTHORITY_PREFIX);
      if (authorityMatch !== null && authorityMatch[1].indexOf("\\") !== -1) {
        parsed.error = "URI authority must not contain a literal backslash.";
        malformedAuthorityOrPort = true;
      }
      const introducerMatch = uri.match(AUTHORITY_INTRODUCER_REGION);
      if (introducerMatch !== null) {
        const region = introducerMatch[1];
        const normalizedRegion = region.replace(/[\t\n\r]/g, "");
        if (normalizedRegion.length >= 2) {
          if (normalizedRegion.slice(0, 2) !== "//") {
            parsed.error = parsed.error || "URI authority must not contain a literal backslash.";
            malformedAuthorityOrPort = true;
          } else if (region.length !== normalizedRegion.length) {
            parsed.error = parsed.error || "URI authority introducer must not contain whitespace.";
            malformedAuthorityOrPort = true;
          }
        }
      }
      const matches = uri.match(URI_PARSE);
      if (matches) {
        parsed.scheme = matches[1];
        parsed.userinfo = matches[3];
        parsed.host = matches[4];
        parsed.port = parseInt(matches[5], 10);
        parsed.path = matches[6] || "";
        parsed.query = matches[7];
        parsed.fragment = matches[8];
        if (parsed.scheme !== void 0) {
          const decodedScheme = unescape(parsed.scheme);
          if (VALID_SCHEME.test(decodedScheme)) {
            parsed.scheme = decodedScheme.toLowerCase();
          } else {
            parsed.error = parsed.error || MALFORMED_SCHEME_ERROR;
            malformedScheme = true;
          }
        }
        malformedPercentEncoding = hasMalformedComponentPercentEncoding(matches);
        if (malformedPercentEncoding) {
          parsed.error = parsed.error || "URI contains malformed percent-encoding.";
        }
        if (isNaN(parsed.port)) {
          parsed.port = matches[5];
        }
        const parseError = getParseError(parsed, matches);
        if (parseError !== void 0) {
          parsed.error = parsed.error || parseError;
          malformedAuthorityOrPort = true;
        }
        if (parsed.host) {
          const ipv4result = isIPv4(parsed.host);
          if (ipv4result === false) {
            const bracketedIPLiteral = isIPLiteral(parsed.host);
            const hasIPLiteralBracket = parsed.host.indexOf("[") !== -1 || parsed.host.indexOf("]") !== -1;
            const ipv6result = normalizeIPv6(parsed.host);
            isIP = ipv6result.isIPV6 || ipv6result.isIPVFuture === true;
            malformedIPLiteral = hasIPLiteralBracket && (!bracketedIPLiteral || ipv6result.error === true);
            parsed.host = isIP ? ipv6result.host : ipv6result.host.toLowerCase();
            if (malformedIPLiteral) {
              parsed.error = parsed.error || "URI host is malformed.";
              malformedAuthorityOrPort = true;
            }
          } else {
            isIP = true;
          }
        }
        if (parsed.scheme === void 0 && parsed.userinfo === void 0 && parsed.host === void 0 && parsed.port === void 0 && parsed.query === void 0 && !parsed.path) {
          parsed.reference = "same-document";
        } else if (parsed.scheme === void 0) {
          parsed.reference = "relative";
        } else if (parsed.fragment === void 0) {
          parsed.reference = "absolute";
        } else {
          parsed.reference = "uri";
        }
        if (options.reference && options.reference !== "suffix" && options.reference !== parsed.reference) {
          parsed.error = parsed.error || "URI is not a " + options.reference + " reference.";
        }
        const schemeHandler = getSchemeHandler(options.scheme || parsed.scheme);
        if (!malformedIPLiteral) {
          malformedHost = canonicalizeHost(parsed, options, schemeHandler, isIP);
        }
        if (uri.indexOf("%") !== -1 && parsed.host !== void 0 && !malformedIPLiteral) {
          let host = isIP ? parsed.host : normalizePercentEncoding(parsed.host, true);
          if (!isIP) {
            host = normalizePercentEncoding(host.toLowerCase());
          }
          parsed.host = reescapeHostDelimiters(host, isIP);
        }
        if (!schemeHandler || schemeHandler && !schemeHandler.skipNormalize) {
          if (parsed.path) {
            parsed.path = normalizePathEncoding(parsed.path);
          }
          if (parsed.query) {
            parsed.query = normalizeQueryFragmentEncoding(parsed.query);
          }
          if (parsed.fragment) {
            parsed.fragment = normalizeQueryFragmentEncoding(parsed.fragment);
          }
        }
        if (schemeHandler && schemeHandler.parse) {
          schemeHandler.parse(parsed, options);
          if (schemeHandler === SCHEMES.urn && parsed.nid === void 0) {
            malformedSchemeSpecific = true;
          }
        }
      } else {
        parsed.error = parsed.error || "URI can not be parsed.";
      }
      return { parsed, malformedAuthorityOrPort, malformedPercentEncoding, malformedSchemeSpecific, malformedHost, malformedScheme };
    }
    function parse(uri, opts) {
      return parseWithStatus(uri, opts).parsed;
    }
    function normalizeString(uri, opts) {
      return normalizeStringWithStatus(uri, opts).normalized;
    }
    function normalizeStringWithStatus(uri, opts) {
      const { parsed, malformedAuthorityOrPort, malformedPercentEncoding, malformedSchemeSpecific, malformedHost, malformedScheme } = parseWithStatus(uri, opts);
      return {
        normalized: malformedAuthorityOrPort || malformedPercentEncoding || malformedSchemeSpecific || malformedHost || malformedScheme ? uri : serialize(parsed, opts),
        malformedAuthorityOrPort,
        malformedPercentEncoding,
        malformedSchemeSpecific,
        malformedHost,
        malformedScheme
      };
    }
    function normalizeComparableURI(uri, opts) {
      if (typeof uri !== "string" && typeof uri !== "object") {
        return void 0;
      }
      let value;
      try {
        value = typeof uri === "string" ? uri : serialize(uri, opts);
      } catch {
        return void 0;
      }
      const { normalized, malformedAuthorityOrPort, malformedPercentEncoding, malformedSchemeSpecific, malformedHost, malformedScheme } = normalizeStringWithStatus(value, opts);
      return malformedAuthorityOrPort || malformedPercentEncoding || malformedSchemeSpecific || malformedHost || malformedScheme ? void 0 : normalized;
    }
    var fastUri = {
      SCHEMES,
      normalize,
      resolve,
      resolveComponent,
      equal,
      serialize,
      parse
    };
    module2.exports = fastUri;
    module2.exports.default = fastUri;
    module2.exports.fastUri = fastUri;
  }
});

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/runtime/uri.js
var require_uri = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/runtime/uri.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var uri = require_fast_uri();
    uri.code = 'require("ajv/dist/runtime/uri").default';
    exports2.default = uri;
  }
});

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/core.js
var require_core = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/core.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.CodeGen = exports2.Name = exports2.nil = exports2.stringify = exports2.str = exports2._ = exports2.KeywordCxt = void 0;
    var validate_1 = require_validate();
    Object.defineProperty(exports2, "KeywordCxt", { enumerable: true, get: function() {
      return validate_1.KeywordCxt;
    } });
    var codegen_1 = require_codegen();
    Object.defineProperty(exports2, "_", { enumerable: true, get: function() {
      return codegen_1._;
    } });
    Object.defineProperty(exports2, "str", { enumerable: true, get: function() {
      return codegen_1.str;
    } });
    Object.defineProperty(exports2, "stringify", { enumerable: true, get: function() {
      return codegen_1.stringify;
    } });
    Object.defineProperty(exports2, "nil", { enumerable: true, get: function() {
      return codegen_1.nil;
    } });
    Object.defineProperty(exports2, "Name", { enumerable: true, get: function() {
      return codegen_1.Name;
    } });
    Object.defineProperty(exports2, "CodeGen", { enumerable: true, get: function() {
      return codegen_1.CodeGen;
    } });
    var validation_error_1 = require_validation_error();
    var ref_error_1 = require_ref_error();
    var rules_1 = require_rules();
    var compile_1 = require_compile();
    var codegen_2 = require_codegen();
    var resolve_1 = require_resolve();
    var dataType_1 = require_dataType();
    var util_1 = require_util();
    var $dataRefSchema = require_data();
    var uri_1 = require_uri();
    var defaultRegExp = (str, flags) => new RegExp(str, flags);
    defaultRegExp.code = "new RegExp";
    var META_IGNORE_OPTIONS = ["removeAdditional", "useDefaults", "coerceTypes"];
    var EXT_SCOPE_NAMES = /* @__PURE__ */ new Set([
      "validate",
      "serialize",
      "parse",
      "wrapper",
      "root",
      "schema",
      "keyword",
      "pattern",
      "formats",
      "validate$data",
      "func",
      "obj",
      "Error"
    ]);
    var removedOptions = {
      errorDataPath: "",
      format: "`validateFormats: false` can be used instead.",
      nullable: '"nullable" keyword is supported by default.',
      jsonPointers: "Deprecated jsPropertySyntax can be used instead.",
      extendRefs: "Deprecated ignoreKeywordsWithRef can be used instead.",
      missingRefs: "Pass empty schema with $id that should be ignored to ajv.addSchema.",
      processCode: "Use option `code: {process: (code, schemaEnv: object) => string}`",
      sourceCode: "Use option `code: {source: true}`",
      strictDefaults: "It is default now, see option `strict`.",
      strictKeywords: "It is default now, see option `strict`.",
      uniqueItems: '"uniqueItems" keyword is always validated.',
      unknownFormats: "Disable strict mode or pass `true` to `ajv.addFormat` (or `formats` option).",
      cache: "Map is used as cache, schema object as key.",
      serialize: "Map is used as cache, schema object as key.",
      ajvErrors: "It is default now."
    };
    var deprecatedOptions = {
      ignoreKeywordsWithRef: "",
      jsPropertySyntax: "",
      unicode: '"minLength"/"maxLength" account for unicode characters by default.'
    };
    var MAX_EXPRESSION = 200;
    function requiredOptions(o) {
      var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0;
      const s = o.strict;
      const _optz = (_a = o.code) === null || _a === void 0 ? void 0 : _a.optimize;
      const optimize = _optz === true || _optz === void 0 ? 1 : _optz || 0;
      const regExp = (_c = (_b = o.code) === null || _b === void 0 ? void 0 : _b.regExp) !== null && _c !== void 0 ? _c : defaultRegExp;
      const uriResolver = (_d = o.uriResolver) !== null && _d !== void 0 ? _d : uri_1.default;
      return {
        strictSchema: (_f = (_e = o.strictSchema) !== null && _e !== void 0 ? _e : s) !== null && _f !== void 0 ? _f : true,
        strictNumbers: (_h = (_g = o.strictNumbers) !== null && _g !== void 0 ? _g : s) !== null && _h !== void 0 ? _h : true,
        strictTypes: (_k = (_j = o.strictTypes) !== null && _j !== void 0 ? _j : s) !== null && _k !== void 0 ? _k : "log",
        strictTuples: (_m = (_l = o.strictTuples) !== null && _l !== void 0 ? _l : s) !== null && _m !== void 0 ? _m : "log",
        strictRequired: (_p = (_o = o.strictRequired) !== null && _o !== void 0 ? _o : s) !== null && _p !== void 0 ? _p : false,
        code: o.code ? { ...o.code, optimize, regExp } : { optimize, regExp },
        loopRequired: (_q = o.loopRequired) !== null && _q !== void 0 ? _q : MAX_EXPRESSION,
        loopEnum: (_r = o.loopEnum) !== null && _r !== void 0 ? _r : MAX_EXPRESSION,
        meta: (_s = o.meta) !== null && _s !== void 0 ? _s : true,
        messages: (_t = o.messages) !== null && _t !== void 0 ? _t : true,
        inlineRefs: (_u = o.inlineRefs) !== null && _u !== void 0 ? _u : true,
        schemaId: (_v = o.schemaId) !== null && _v !== void 0 ? _v : "$id",
        addUsedSchema: (_w = o.addUsedSchema) !== null && _w !== void 0 ? _w : true,
        validateSchema: (_x = o.validateSchema) !== null && _x !== void 0 ? _x : true,
        validateFormats: (_y = o.validateFormats) !== null && _y !== void 0 ? _y : true,
        unicodeRegExp: (_z = o.unicodeRegExp) !== null && _z !== void 0 ? _z : true,
        int32range: (_0 = o.int32range) !== null && _0 !== void 0 ? _0 : true,
        uriResolver
      };
    }
    var Ajv = class {
      constructor(opts = {}) {
        this.schemas = {};
        this.refs = {};
        this.formats = /* @__PURE__ */ Object.create(null);
        this._compilations = /* @__PURE__ */ new Set();
        this._loading = {};
        this._cache = /* @__PURE__ */ new Map();
        opts = this.opts = { ...opts, ...requiredOptions(opts) };
        const { es5, lines } = this.opts.code;
        this.scope = new codegen_2.ValueScope({ scope: {}, prefixes: EXT_SCOPE_NAMES, es5, lines });
        this.logger = getLogger(opts.logger);
        const formatOpt = opts.validateFormats;
        opts.validateFormats = false;
        this.RULES = (0, rules_1.getRules)();
        checkOptions.call(this, removedOptions, opts, "NOT SUPPORTED");
        checkOptions.call(this, deprecatedOptions, opts, "DEPRECATED", "warn");
        this._metaOpts = getMetaSchemaOptions.call(this);
        if (opts.formats)
          addInitialFormats.call(this);
        this._addVocabularies();
        this._addDefaultMetaSchema();
        if (opts.keywords)
          addInitialKeywords.call(this, opts.keywords);
        if (typeof opts.meta == "object")
          this.addMetaSchema(opts.meta);
        addInitialSchemas.call(this);
        opts.validateFormats = formatOpt;
      }
      _addVocabularies() {
        this.addKeyword("$async");
      }
      _addDefaultMetaSchema() {
        const { $data, meta, schemaId } = this.opts;
        let _dataRefSchema = $dataRefSchema;
        if (schemaId === "id") {
          _dataRefSchema = { ...$dataRefSchema };
          _dataRefSchema.id = _dataRefSchema.$id;
          delete _dataRefSchema.$id;
        }
        if (meta && $data)
          this.addMetaSchema(_dataRefSchema, _dataRefSchema[schemaId], false);
      }
      defaultMeta() {
        const { meta, schemaId } = this.opts;
        return this.opts.defaultMeta = typeof meta == "object" ? meta[schemaId] || meta : void 0;
      }
      validate(schemaKeyRef, data) {
        let v;
        if (typeof schemaKeyRef == "string") {
          v = this.getSchema(schemaKeyRef);
          if (!v)
            throw new Error(`no schema with key or ref "${schemaKeyRef}"`);
        } else {
          v = this.compile(schemaKeyRef);
        }
        const valid = v(data);
        if (!("$async" in v))
          this.errors = v.errors;
        return valid;
      }
      compile(schema, _meta) {
        const sch = this._addSchema(schema, _meta);
        return sch.validate || this._compileSchemaEnv(sch);
      }
      compileAsync(schema, meta) {
        if (typeof this.opts.loadSchema != "function") {
          throw new Error("options.loadSchema should be a function");
        }
        const { loadSchema } = this.opts;
        return runCompileAsync.call(this, schema, meta);
        async function runCompileAsync(_schema, _meta) {
          await loadMetaSchema.call(this, _schema.$schema);
          const sch = this._addSchema(_schema, _meta);
          return sch.validate || _compileAsync.call(this, sch);
        }
        async function loadMetaSchema($ref) {
          if ($ref && !this.getSchema($ref)) {
            await runCompileAsync.call(this, { $ref }, true);
          }
        }
        async function _compileAsync(sch) {
          try {
            return this._compileSchemaEnv(sch);
          } catch (e) {
            if (!(e instanceof ref_error_1.default))
              throw e;
            checkLoaded.call(this, e);
            await loadMissingSchema.call(this, e.missingSchema);
            return _compileAsync.call(this, sch);
          }
        }
        function checkLoaded({ missingSchema: ref, missingRef }) {
          if (this.refs[ref]) {
            throw new Error(`AnySchema ${ref} is loaded but ${missingRef} cannot be resolved`);
          }
        }
        async function loadMissingSchema(ref) {
          const _schema = await _loadSchema.call(this, ref);
          if (!this.refs[ref])
            await loadMetaSchema.call(this, _schema.$schema);
          if (!this.refs[ref])
            this.addSchema(_schema, ref, meta);
        }
        async function _loadSchema(ref) {
          const p = this._loading[ref];
          if (p)
            return p;
          try {
            return await (this._loading[ref] = loadSchema(ref));
          } finally {
            delete this._loading[ref];
          }
        }
      }
      // Adds schema to the instance
      addSchema(schema, key, _meta, _validateSchema = this.opts.validateSchema) {
        if (Array.isArray(schema)) {
          for (const sch of schema)
            this.addSchema(sch, void 0, _meta, _validateSchema);
          return this;
        }
        let id;
        if (typeof schema === "object") {
          const { schemaId } = this.opts;
          id = schema[schemaId];
          if (id !== void 0 && typeof id != "string") {
            throw new Error(`schema ${schemaId} must be string`);
          }
        }
        key = (0, resolve_1.normalizeId)(key || id);
        this._checkUnique(key);
        this.schemas[key] = this._addSchema(schema, _meta, key, _validateSchema, true);
        return this;
      }
      // Add schema that will be used to validate other schemas
      // options in META_IGNORE_OPTIONS are alway set to false
      addMetaSchema(schema, key, _validateSchema = this.opts.validateSchema) {
        this.addSchema(schema, key, true, _validateSchema);
        return this;
      }
      //  Validate schema against its meta-schema
      validateSchema(schema, throwOrLogError) {
        if (typeof schema == "boolean")
          return true;
        let $schema;
        $schema = schema.$schema;
        if ($schema !== void 0 && typeof $schema != "string") {
          throw new Error("$schema must be a string");
        }
        $schema = $schema || this.opts.defaultMeta || this.defaultMeta();
        if (!$schema) {
          this.logger.warn("meta-schema not available");
          this.errors = null;
          return true;
        }
        const valid = this.validate($schema, schema);
        if (!valid && throwOrLogError) {
          const message = "schema is invalid: " + this.errorsText();
          if (this.opts.validateSchema === "log")
            this.logger.error(message);
          else
            throw new Error(message);
        }
        return valid;
      }
      // Get compiled schema by `key` or `ref`.
      // (`key` that was passed to `addSchema` or full schema reference - `schema.$id` or resolved id)
      getSchema(keyRef) {
        let sch;
        while (typeof (sch = getSchEnv.call(this, keyRef)) == "string")
          keyRef = sch;
        if (sch === void 0) {
          const { schemaId } = this.opts;
          const root = new compile_1.SchemaEnv({ schema: {}, schemaId });
          sch = compile_1.resolveSchema.call(this, root, keyRef);
          if (!sch)
            return;
          this.refs[keyRef] = sch;
        }
        return sch.validate || this._compileSchemaEnv(sch);
      }
      // Remove cached schema(s).
      // If no parameter is passed all schemas but meta-schemas are removed.
      // If RegExp is passed all schemas with key/id matching pattern but meta-schemas are removed.
      // Even if schema is referenced by other schemas it still can be removed as other schemas have local references.
      removeSchema(schemaKeyRef) {
        if (schemaKeyRef instanceof RegExp) {
          this._removeAllSchemas(this.schemas, schemaKeyRef);
          this._removeAllSchemas(this.refs, schemaKeyRef);
          return this;
        }
        switch (typeof schemaKeyRef) {
          case "undefined":
            this._removeAllSchemas(this.schemas);
            this._removeAllSchemas(this.refs);
            this._cache.clear();
            return this;
          case "string": {
            const sch = getSchEnv.call(this, schemaKeyRef);
            if (typeof sch == "object")
              this._cache.delete(sch.schema);
            delete this.schemas[schemaKeyRef];
            delete this.refs[schemaKeyRef];
            return this;
          }
          case "object": {
            const cacheKey = schemaKeyRef;
            this._cache.delete(cacheKey);
            let id = schemaKeyRef[this.opts.schemaId];
            if (id) {
              id = (0, resolve_1.normalizeId)(id);
              delete this.schemas[id];
              delete this.refs[id];
            }
            return this;
          }
          default:
            throw new Error("ajv.removeSchema: invalid parameter");
        }
      }
      // add "vocabulary" - a collection of keywords
      addVocabulary(definitions2) {
        for (const def of definitions2)
          this.addKeyword(def);
        return this;
      }
      addKeyword(kwdOrDef, def) {
        let keyword;
        if (typeof kwdOrDef == "string") {
          keyword = kwdOrDef;
          if (typeof def == "object") {
            this.logger.warn("these parameters are deprecated, see docs for addKeyword");
            def.keyword = keyword;
          }
        } else if (typeof kwdOrDef == "object" && def === void 0) {
          def = kwdOrDef;
          keyword = def.keyword;
          if (Array.isArray(keyword) && !keyword.length) {
            throw new Error("addKeywords: keyword must be string or non-empty array");
          }
        } else {
          throw new Error("invalid addKeywords parameters");
        }
        checkKeyword.call(this, keyword, def);
        if (!def) {
          (0, util_1.eachItem)(keyword, (kwd) => addRule.call(this, kwd));
          return this;
        }
        keywordMetaschema.call(this, def);
        const definition = {
          ...def,
          type: (0, dataType_1.getJSONTypes)(def.type),
          schemaType: (0, dataType_1.getJSONTypes)(def.schemaType)
        };
        (0, util_1.eachItem)(keyword, definition.type.length === 0 ? (k) => addRule.call(this, k, definition) : (k) => definition.type.forEach((t) => addRule.call(this, k, definition, t)));
        return this;
      }
      getKeyword(keyword) {
        const rule = this.RULES.all[keyword];
        return typeof rule == "object" ? rule.definition : !!rule;
      }
      // Remove keyword
      removeKeyword(keyword) {
        const { RULES } = this;
        delete RULES.keywords[keyword];
        delete RULES.all[keyword];
        for (const group of RULES.rules) {
          const i = group.rules.findIndex((rule) => rule.keyword === keyword);
          if (i >= 0)
            group.rules.splice(i, 1);
        }
        return this;
      }
      // Add format
      addFormat(name, format) {
        if (typeof format == "string")
          format = new RegExp(format);
        this.formats[name] = format;
        return this;
      }
      errorsText(errors = this.errors, { separator = ", ", dataVar = "data" } = {}) {
        if (!errors || errors.length === 0)
          return "No errors";
        return errors.map((e) => `${dataVar}${e.instancePath} ${e.message}`).reduce((text3, msg) => text3 + separator + msg);
      }
      $dataMetaSchema(metaSchema, keywordsJsonPointers) {
        const rules = this.RULES.all;
        metaSchema = JSON.parse(JSON.stringify(metaSchema));
        for (const jsonPointer of keywordsJsonPointers) {
          const segments = jsonPointer.split("/").slice(1);
          let keywords = metaSchema;
          for (const seg of segments)
            keywords = keywords[seg];
          for (const key in rules) {
            const rule = rules[key];
            if (typeof rule != "object")
              continue;
            const { $data } = rule.definition;
            const schema = keywords[key];
            if ($data && schema)
              keywords[key] = schemaOrData(schema);
          }
        }
        return metaSchema;
      }
      _removeAllSchemas(schemas, regex) {
        for (const keyRef in schemas) {
          const sch = schemas[keyRef];
          if (!regex || regex.test(keyRef)) {
            if (typeof sch == "string") {
              delete schemas[keyRef];
            } else if (sch && !sch.meta) {
              this._cache.delete(sch.schema);
              delete schemas[keyRef];
            }
          }
        }
      }
      _addSchema(schema, meta, baseId, validateSchema = this.opts.validateSchema, addSchema = this.opts.addUsedSchema) {
        let id;
        const { schemaId } = this.opts;
        if (typeof schema == "object") {
          id = schema[schemaId];
        } else {
          if (this.opts.jtd)
            throw new Error("schema must be object");
          else if (typeof schema != "boolean")
            throw new Error("schema must be object or boolean");
        }
        let sch = this._cache.get(schema);
        if (sch !== void 0)
          return sch;
        baseId = (0, resolve_1.normalizeId)(id || baseId);
        const localRefs = resolve_1.getSchemaRefs.call(this, schema, baseId);
        sch = new compile_1.SchemaEnv({ schema, schemaId, meta, baseId, localRefs });
        this._cache.set(sch.schema, sch);
        if (addSchema && !baseId.startsWith("#")) {
          if (baseId)
            this._checkUnique(baseId);
          this.refs[baseId] = sch;
        }
        if (validateSchema)
          this.validateSchema(schema, true);
        return sch;
      }
      _checkUnique(id) {
        if (this.schemas[id] || this.refs[id]) {
          throw new Error(`schema with key or id "${id}" already exists`);
        }
      }
      _compileSchemaEnv(sch) {
        if (sch.meta)
          this._compileMetaSchema(sch);
        else
          compile_1.compileSchema.call(this, sch);
        if (!sch.validate)
          throw new Error("ajv implementation error");
        return sch.validate;
      }
      _compileMetaSchema(sch) {
        const currentOpts = this.opts;
        this.opts = this._metaOpts;
        try {
          compile_1.compileSchema.call(this, sch);
        } finally {
          this.opts = currentOpts;
        }
      }
    };
    Ajv.ValidationError = validation_error_1.default;
    Ajv.MissingRefError = ref_error_1.default;
    exports2.default = Ajv;
    function checkOptions(checkOpts, options, msg, log = "error") {
      for (const key in checkOpts) {
        const opt = key;
        if (opt in options)
          this.logger[log](`${msg}: option ${key}. ${checkOpts[opt]}`);
      }
    }
    function getSchEnv(keyRef) {
      keyRef = (0, resolve_1.normalizeId)(keyRef);
      return this.schemas[keyRef] || this.refs[keyRef];
    }
    function addInitialSchemas() {
      const optsSchemas = this.opts.schemas;
      if (!optsSchemas)
        return;
      if (Array.isArray(optsSchemas))
        this.addSchema(optsSchemas);
      else
        for (const key in optsSchemas)
          this.addSchema(optsSchemas[key], key);
    }
    function addInitialFormats() {
      for (const name in this.opts.formats) {
        const format = this.opts.formats[name];
        if (format)
          this.addFormat(name, format);
      }
    }
    function addInitialKeywords(defs) {
      if (Array.isArray(defs)) {
        this.addVocabulary(defs);
        return;
      }
      this.logger.warn("keywords option as map is deprecated, pass array");
      for (const keyword in defs) {
        const def = defs[keyword];
        if (!def.keyword)
          def.keyword = keyword;
        this.addKeyword(def);
      }
    }
    function getMetaSchemaOptions() {
      const metaOpts = { ...this.opts };
      for (const opt of META_IGNORE_OPTIONS)
        delete metaOpts[opt];
      return metaOpts;
    }
    var noLogs = { log() {
    }, warn() {
    }, error() {
    } };
    function getLogger(logger) {
      if (logger === false)
        return noLogs;
      if (logger === void 0)
        return console;
      if (logger.log && logger.warn && logger.error)
        return logger;
      throw new Error("logger must implement log, warn and error methods");
    }
    var KEYWORD_NAME = /^[a-z_$][a-z0-9_$:-]*$/i;
    function checkKeyword(keyword, def) {
      const { RULES } = this;
      (0, util_1.eachItem)(keyword, (kwd) => {
        if (RULES.keywords[kwd])
          throw new Error(`Keyword ${kwd} is already defined`);
        if (!KEYWORD_NAME.test(kwd))
          throw new Error(`Keyword ${kwd} has invalid name`);
      });
      if (!def)
        return;
      if (def.$data && !("code" in def || "validate" in def)) {
        throw new Error('$data keyword must have "code" or "validate" function');
      }
    }
    function addRule(keyword, definition, dataType) {
      var _a;
      const post = definition === null || definition === void 0 ? void 0 : definition.post;
      if (dataType && post)
        throw new Error('keyword with "post" flag cannot have "type"');
      const { RULES } = this;
      let ruleGroup = post ? RULES.post : RULES.rules.find(({ type: t }) => t === dataType);
      if (!ruleGroup) {
        ruleGroup = { type: dataType, rules: [] };
        RULES.rules.push(ruleGroup);
      }
      RULES.keywords[keyword] = true;
      if (!definition)
        return;
      const rule = {
        keyword,
        definition: {
          ...definition,
          type: (0, dataType_1.getJSONTypes)(definition.type),
          schemaType: (0, dataType_1.getJSONTypes)(definition.schemaType)
        }
      };
      if (definition.before)
        addBeforeRule.call(this, ruleGroup, rule, definition.before);
      else
        ruleGroup.rules.push(rule);
      RULES.all[keyword] = rule;
      (_a = definition.implements) === null || _a === void 0 ? void 0 : _a.forEach((kwd) => this.addKeyword(kwd));
    }
    function addBeforeRule(ruleGroup, rule, before) {
      const i = ruleGroup.rules.findIndex((_rule) => _rule.keyword === before);
      if (i >= 0) {
        ruleGroup.rules.splice(i, 0, rule);
      } else {
        ruleGroup.rules.push(rule);
        this.logger.warn(`rule ${before} is not defined`);
      }
    }
    function keywordMetaschema(def) {
      let { metaSchema } = def;
      if (metaSchema === void 0)
        return;
      if (def.$data && this.opts.$data)
        metaSchema = schemaOrData(metaSchema);
      def.validateSchema = this.compile(metaSchema, true);
    }
    var $dataRef = {
      $ref: "https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#"
    };
    function schemaOrData(schema) {
      return { anyOf: [schema, $dataRef] };
    }
  }
});

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/core/id.js
var require_id = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/core/id.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var def = {
      keyword: "id",
      code() {
        throw new Error('NOT SUPPORTED: keyword "id", use "$id" for schema ID');
      }
    };
    exports2.default = def;
  }
});

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/core/ref.js
var require_ref = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/core/ref.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.callRef = exports2.getValidate = void 0;
    var ref_error_1 = require_ref_error();
    var code_1 = require_code2();
    var codegen_1 = require_codegen();
    var names_1 = require_names();
    var compile_1 = require_compile();
    var util_1 = require_util();
    var def = {
      keyword: "$ref",
      schemaType: "string",
      code(cxt) {
        const { gen, schema: $ref, it } = cxt;
        const { baseId, schemaEnv: env, validateName, opts, self } = it;
        const { root } = env;
        if (($ref === "#" || $ref === "#/") && baseId === root.baseId)
          return callRootRef();
        const schOrEnv = compile_1.resolveRef.call(self, root, baseId, $ref);
        if (schOrEnv === void 0)
          throw new ref_error_1.default(it.opts.uriResolver, baseId, $ref);
        if (schOrEnv instanceof compile_1.SchemaEnv)
          return callValidate(schOrEnv);
        return inlineRefSchema(schOrEnv);
        function callRootRef() {
          if (env === root)
            return callRef(cxt, validateName, env, env.$async);
          const rootName = gen.scopeValue("root", { ref: root });
          return callRef(cxt, (0, codegen_1._)`${rootName}.validate`, root, root.$async);
        }
        function callValidate(sch) {
          const v = getValidate(cxt, sch);
          callRef(cxt, v, sch, sch.$async);
        }
        function inlineRefSchema(sch) {
          const schName = gen.scopeValue("schema", opts.code.source === true ? { ref: sch, code: (0, codegen_1.stringify)(sch) } : { ref: sch });
          const valid = gen.name("valid");
          const schCxt = cxt.subschema({
            schema: sch,
            dataTypes: [],
            schemaPath: codegen_1.nil,
            topSchemaRef: schName,
            errSchemaPath: $ref
          }, valid);
          cxt.mergeEvaluated(schCxt);
          cxt.ok(valid);
        }
      }
    };
    function getValidate(cxt, sch) {
      const { gen } = cxt;
      return sch.validate ? gen.scopeValue("validate", { ref: sch.validate }) : (0, codegen_1._)`${gen.scopeValue("wrapper", { ref: sch })}.validate`;
    }
    exports2.getValidate = getValidate;
    function callRef(cxt, v, sch, $async) {
      const { gen, it } = cxt;
      const { allErrors, schemaEnv: env, opts } = it;
      const passCxt = opts.passContext ? names_1.default.this : codegen_1.nil;
      if ($async)
        callAsyncRef();
      else
        callSyncRef();
      function callAsyncRef() {
        if (!env.$async)
          throw new Error("async schema referenced by sync schema");
        const valid = gen.let("valid");
        gen.try(() => {
          gen.code((0, codegen_1._)`await ${(0, code_1.callValidateCode)(cxt, v, passCxt)}`);
          addEvaluatedFrom(v);
          if (!allErrors)
            gen.assign(valid, true);
        }, (e) => {
          gen.if((0, codegen_1._)`!(${e} instanceof ${it.ValidationError})`, () => gen.throw(e));
          addErrorsFrom(e);
          if (!allErrors)
            gen.assign(valid, false);
        });
        cxt.ok(valid);
      }
      function callSyncRef() {
        cxt.result((0, code_1.callValidateCode)(cxt, v, passCxt), () => addEvaluatedFrom(v), () => addErrorsFrom(v));
      }
      function addErrorsFrom(source) {
        const errs = (0, codegen_1._)`${source}.errors`;
        gen.assign(names_1.default.vErrors, (0, codegen_1._)`${names_1.default.vErrors} === null ? ${errs} : ${names_1.default.vErrors}.concat(${errs})`);
        gen.assign(names_1.default.errors, (0, codegen_1._)`${names_1.default.vErrors}.length`);
      }
      function addEvaluatedFrom(source) {
        var _a;
        if (!it.opts.unevaluated)
          return;
        const schEvaluated = (_a = sch === null || sch === void 0 ? void 0 : sch.validate) === null || _a === void 0 ? void 0 : _a.evaluated;
        if (it.props !== true) {
          if (schEvaluated && !schEvaluated.dynamicProps) {
            if (schEvaluated.props !== void 0) {
              it.props = util_1.mergeEvaluated.props(gen, schEvaluated.props, it.props);
            }
          } else {
            const props = gen.var("props", (0, codegen_1._)`${source}.evaluated.props`);
            it.props = util_1.mergeEvaluated.props(gen, props, it.props, codegen_1.Name);
          }
        }
        if (it.items !== true) {
          if (schEvaluated && !schEvaluated.dynamicItems) {
            if (schEvaluated.items !== void 0) {
              it.items = util_1.mergeEvaluated.items(gen, schEvaluated.items, it.items);
            }
          } else {
            const items = gen.var("items", (0, codegen_1._)`${source}.evaluated.items`);
            it.items = util_1.mergeEvaluated.items(gen, items, it.items, codegen_1.Name);
          }
        }
      }
    }
    exports2.callRef = callRef;
    exports2.default = def;
  }
});

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/core/index.js
var require_core2 = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/core/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var id_1 = require_id();
    var ref_1 = require_ref();
    var core = [
      "$schema",
      "$id",
      "$defs",
      "$vocabulary",
      { keyword: "$comment" },
      "definitions",
      id_1.default,
      ref_1.default
    ];
    exports2.default = core;
  }
});

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/validation/limitNumber.js
var require_limitNumber = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/validation/limitNumber.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var ops = codegen_1.operators;
    var KWDs = {
      maximum: { okStr: "<=", ok: ops.LTE, fail: ops.GT },
      minimum: { okStr: ">=", ok: ops.GTE, fail: ops.LT },
      exclusiveMaximum: { okStr: "<", ok: ops.LT, fail: ops.GTE },
      exclusiveMinimum: { okStr: ">", ok: ops.GT, fail: ops.LTE }
    };
    var error = {
      message: ({ keyword, schemaCode }) => (0, codegen_1.str)`must be ${KWDs[keyword].okStr} ${schemaCode}`,
      params: ({ keyword, schemaCode }) => (0, codegen_1._)`{comparison: ${KWDs[keyword].okStr}, limit: ${schemaCode}}`
    };
    var def = {
      keyword: Object.keys(KWDs),
      type: "number",
      schemaType: "number",
      $data: true,
      error,
      code(cxt) {
        const { keyword, data, schemaCode } = cxt;
        cxt.fail$data((0, codegen_1._)`${data} ${KWDs[keyword].fail} ${schemaCode} || isNaN(${data})`);
      }
    };
    exports2.default = def;
  }
});

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/validation/multipleOf.js
var require_multipleOf = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/validation/multipleOf.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var error = {
      message: ({ schemaCode }) => (0, codegen_1.str)`must be multiple of ${schemaCode}`,
      params: ({ schemaCode }) => (0, codegen_1._)`{multipleOf: ${schemaCode}}`
    };
    var def = {
      keyword: "multipleOf",
      type: "number",
      schemaType: "number",
      $data: true,
      error,
      code(cxt) {
        const { gen, data, schemaCode, it } = cxt;
        const prec = it.opts.multipleOfPrecision;
        const res = gen.let("res");
        const invalid = prec ? (0, codegen_1._)`Math.abs(Math.round(${res}) - ${res}) > 1e-${prec}` : (0, codegen_1._)`${res} !== parseInt(${res})`;
        cxt.fail$data((0, codegen_1._)`(${schemaCode} === 0 || (${res} = ${data}/${schemaCode}, ${invalid}))`);
      }
    };
    exports2.default = def;
  }
});

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/runtime/ucs2length.js
var require_ucs2length = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/runtime/ucs2length.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    function ucs2length(str) {
      const len = str.length;
      let length = 0;
      let pos = 0;
      let value;
      while (pos < len) {
        length++;
        value = str.charCodeAt(pos++);
        if (value >= 55296 && value <= 56319 && pos < len) {
          value = str.charCodeAt(pos);
          if ((value & 64512) === 56320)
            pos++;
        }
      }
      return length;
    }
    exports2.default = ucs2length;
    ucs2length.code = 'require("ajv/dist/runtime/ucs2length").default';
  }
});

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/validation/limitLength.js
var require_limitLength = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/validation/limitLength.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var ucs2length_1 = require_ucs2length();
    var error = {
      message({ keyword, schemaCode }) {
        const comp = keyword === "maxLength" ? "more" : "fewer";
        return (0, codegen_1.str)`must NOT have ${comp} than ${schemaCode} characters`;
      },
      params: ({ schemaCode }) => (0, codegen_1._)`{limit: ${schemaCode}}`
    };
    var def = {
      keyword: ["maxLength", "minLength"],
      type: "string",
      schemaType: "number",
      $data: true,
      error,
      code(cxt) {
        const { keyword, data, schemaCode, it } = cxt;
        const op = keyword === "maxLength" ? codegen_1.operators.GT : codegen_1.operators.LT;
        const len = it.opts.unicode === false ? (0, codegen_1._)`${data}.length` : (0, codegen_1._)`${(0, util_1.useFunc)(cxt.gen, ucs2length_1.default)}(${data})`;
        cxt.fail$data((0, codegen_1._)`${len} ${op} ${schemaCode}`);
      }
    };
    exports2.default = def;
  }
});

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/validation/pattern.js
var require_pattern = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/validation/pattern.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var code_1 = require_code2();
    var util_1 = require_util();
    var codegen_1 = require_codegen();
    var error = {
      message: ({ schemaCode }) => (0, codegen_1.str)`must match pattern "${schemaCode}"`,
      params: ({ schemaCode }) => (0, codegen_1._)`{pattern: ${schemaCode}}`
    };
    var def = {
      keyword: "pattern",
      type: "string",
      schemaType: "string",
      $data: true,
      error,
      code(cxt) {
        const { gen, data, $data, schema, schemaCode, it } = cxt;
        const u = it.opts.unicodeRegExp ? "u" : "";
        if ($data) {
          const { regExp } = it.opts.code;
          const regExpCode = regExp.code === "new RegExp" ? (0, codegen_1._)`new RegExp` : (0, util_1.useFunc)(gen, regExp);
          const valid = gen.let("valid");
          gen.try(() => gen.assign(valid, (0, codegen_1._)`${regExpCode}(${schemaCode}, ${u}).test(${data})`), () => gen.assign(valid, false));
          cxt.fail$data((0, codegen_1._)`!${valid}`);
        } else {
          const regExp = (0, code_1.usePattern)(cxt, schema);
          cxt.fail$data((0, codegen_1._)`!${regExp}.test(${data})`);
        }
      }
    };
    exports2.default = def;
  }
});

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/validation/limitProperties.js
var require_limitProperties = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/validation/limitProperties.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var error = {
      message({ keyword, schemaCode }) {
        const comp = keyword === "maxProperties" ? "more" : "fewer";
        return (0, codegen_1.str)`must NOT have ${comp} than ${schemaCode} properties`;
      },
      params: ({ schemaCode }) => (0, codegen_1._)`{limit: ${schemaCode}}`
    };
    var def = {
      keyword: ["maxProperties", "minProperties"],
      type: "object",
      schemaType: "number",
      $data: true,
      error,
      code(cxt) {
        const { keyword, data, schemaCode } = cxt;
        const op = keyword === "maxProperties" ? codegen_1.operators.GT : codegen_1.operators.LT;
        cxt.fail$data((0, codegen_1._)`Object.keys(${data}).length ${op} ${schemaCode}`);
      }
    };
    exports2.default = def;
  }
});

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/validation/required.js
var require_required = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/validation/required.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var code_1 = require_code2();
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var error = {
      message: ({ params: { missingProperty } }) => (0, codegen_1.str)`must have required property '${missingProperty}'`,
      params: ({ params: { missingProperty } }) => (0, codegen_1._)`{missingProperty: ${missingProperty}}`
    };
    var def = {
      keyword: "required",
      type: "object",
      schemaType: "array",
      $data: true,
      error,
      code(cxt) {
        const { gen, schema, schemaCode, data, $data, it } = cxt;
        const { opts } = it;
        if (!$data && schema.length === 0)
          return;
        const useLoop = schema.length >= opts.loopRequired;
        if (it.allErrors)
          allErrorsMode();
        else
          exitOnErrorMode();
        if (opts.strictRequired) {
          const props = cxt.parentSchema.properties;
          const { definedProperties } = cxt.it;
          for (const requiredKey of schema) {
            if ((props === null || props === void 0 ? void 0 : props[requiredKey]) === void 0 && !definedProperties.has(requiredKey)) {
              const schemaPath = it.schemaEnv.baseId + it.errSchemaPath;
              const msg = `required property "${requiredKey}" is not defined at "${schemaPath}" (strictRequired)`;
              (0, util_1.checkStrictMode)(it, msg, it.opts.strictRequired);
            }
          }
        }
        function allErrorsMode() {
          if (useLoop || $data) {
            cxt.block$data(codegen_1.nil, loopAllRequired);
          } else {
            for (const prop of schema) {
              (0, code_1.checkReportMissingProp)(cxt, prop);
            }
          }
        }
        function exitOnErrorMode() {
          const missing = gen.let("missing");
          if (useLoop || $data) {
            const valid = gen.let("valid", true);
            cxt.block$data(valid, () => loopUntilMissing(missing, valid));
            cxt.ok(valid);
          } else {
            gen.if((0, code_1.checkMissingProp)(cxt, schema, missing));
            (0, code_1.reportMissingProp)(cxt, missing);
            gen.else();
          }
        }
        function loopAllRequired() {
          gen.forOf("prop", schemaCode, (prop) => {
            cxt.setParams({ missingProperty: prop });
            gen.if((0, code_1.noPropertyInData)(gen, data, prop, opts.ownProperties), () => cxt.error());
          });
        }
        function loopUntilMissing(missing, valid) {
          cxt.setParams({ missingProperty: missing });
          gen.forOf(missing, schemaCode, () => {
            gen.assign(valid, (0, code_1.propertyInData)(gen, data, missing, opts.ownProperties));
            gen.if((0, codegen_1.not)(valid), () => {
              cxt.error();
              gen.break();
            });
          }, codegen_1.nil);
        }
      }
    };
    exports2.default = def;
  }
});

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/validation/limitItems.js
var require_limitItems = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/validation/limitItems.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var error = {
      message({ keyword, schemaCode }) {
        const comp = keyword === "maxItems" ? "more" : "fewer";
        return (0, codegen_1.str)`must NOT have ${comp} than ${schemaCode} items`;
      },
      params: ({ schemaCode }) => (0, codegen_1._)`{limit: ${schemaCode}}`
    };
    var def = {
      keyword: ["maxItems", "minItems"],
      type: "array",
      schemaType: "number",
      $data: true,
      error,
      code(cxt) {
        const { keyword, data, schemaCode } = cxt;
        const op = keyword === "maxItems" ? codegen_1.operators.GT : codegen_1.operators.LT;
        cxt.fail$data((0, codegen_1._)`${data}.length ${op} ${schemaCode}`);
      }
    };
    exports2.default = def;
  }
});

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/runtime/equal.js
var require_equal = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/runtime/equal.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var equal = require_fast_deep_equal();
    equal.code = 'require("ajv/dist/runtime/equal").default';
    exports2.default = equal;
  }
});

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/validation/uniqueItems.js
var require_uniqueItems = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/validation/uniqueItems.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var dataType_1 = require_dataType();
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var equal_1 = require_equal();
    var error = {
      message: ({ params: { i, j } }) => (0, codegen_1.str)`must NOT have duplicate items (items ## ${j} and ${i} are identical)`,
      params: ({ params: { i, j } }) => (0, codegen_1._)`{i: ${i}, j: ${j}}`
    };
    var def = {
      keyword: "uniqueItems",
      type: "array",
      schemaType: "boolean",
      $data: true,
      error,
      code(cxt) {
        const { gen, data, $data, schema, parentSchema, schemaCode, it } = cxt;
        if (!$data && !schema)
          return;
        const valid = gen.let("valid");
        const itemTypes = parentSchema.items ? (0, dataType_1.getSchemaTypes)(parentSchema.items) : [];
        cxt.block$data(valid, validateUniqueItems, (0, codegen_1._)`${schemaCode} === false`);
        cxt.ok(valid);
        function validateUniqueItems() {
          const i = gen.let("i", (0, codegen_1._)`${data}.length`);
          const j = gen.let("j");
          cxt.setParams({ i, j });
          gen.assign(valid, true);
          gen.if((0, codegen_1._)`${i} > 1`, () => (canOptimize() ? loopN : loopN2)(i, j));
        }
        function canOptimize() {
          return itemTypes.length > 0 && !itemTypes.some((t) => t === "object" || t === "array");
        }
        function loopN(i, j) {
          const item = gen.name("item");
          const wrongType = (0, dataType_1.checkDataTypes)(itemTypes, item, it.opts.strictNumbers, dataType_1.DataType.Wrong);
          const indices = gen.const("indices", (0, codegen_1._)`{}`);
          gen.for((0, codegen_1._)`;${i}--;`, () => {
            gen.let(item, (0, codegen_1._)`${data}[${i}]`);
            gen.if(wrongType, (0, codegen_1._)`continue`);
            if (itemTypes.length > 1)
              gen.if((0, codegen_1._)`typeof ${item} == "string"`, (0, codegen_1._)`${item} += "_"`);
            gen.if((0, codegen_1._)`typeof ${indices}[${item}] == "number"`, () => {
              gen.assign(j, (0, codegen_1._)`${indices}[${item}]`);
              cxt.error();
              gen.assign(valid, false).break();
            }).code((0, codegen_1._)`${indices}[${item}] = ${i}`);
          });
        }
        function loopN2(i, j) {
          const eql = (0, util_1.useFunc)(gen, equal_1.default);
          const outer = gen.name("outer");
          gen.label(outer).for((0, codegen_1._)`;${i}--;`, () => gen.for((0, codegen_1._)`${j} = ${i}; ${j}--;`, () => gen.if((0, codegen_1._)`${eql}(${data}[${i}], ${data}[${j}])`, () => {
            cxt.error();
            gen.assign(valid, false).break(outer);
          })));
        }
      }
    };
    exports2.default = def;
  }
});

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/validation/const.js
var require_const = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/validation/const.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var equal_1 = require_equal();
    var error = {
      message: "must be equal to constant",
      params: ({ schemaCode }) => (0, codegen_1._)`{allowedValue: ${schemaCode}}`
    };
    var def = {
      keyword: "const",
      $data: true,
      error,
      code(cxt) {
        const { gen, data, $data, schemaCode, schema } = cxt;
        if ($data || schema && typeof schema == "object") {
          cxt.fail$data((0, codegen_1._)`!${(0, util_1.useFunc)(gen, equal_1.default)}(${data}, ${schemaCode})`);
        } else {
          cxt.fail((0, codegen_1._)`${schema} !== ${data}`);
        }
      }
    };
    exports2.default = def;
  }
});

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/validation/enum.js
var require_enum = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/validation/enum.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var equal_1 = require_equal();
    var error = {
      message: "must be equal to one of the allowed values",
      params: ({ schemaCode }) => (0, codegen_1._)`{allowedValues: ${schemaCode}}`
    };
    var def = {
      keyword: "enum",
      schemaType: "array",
      $data: true,
      error,
      code(cxt) {
        const { gen, data, $data, schema, schemaCode, it } = cxt;
        if (!$data && schema.length === 0)
          throw new Error("enum must have non-empty array");
        const useLoop = schema.length >= it.opts.loopEnum;
        let eql;
        const getEql = () => eql !== null && eql !== void 0 ? eql : eql = (0, util_1.useFunc)(gen, equal_1.default);
        let valid;
        if (useLoop || $data) {
          valid = gen.let("valid");
          cxt.block$data(valid, loopEnum);
        } else {
          if (!Array.isArray(schema))
            throw new Error("ajv implementation error");
          const vSchema = gen.const("vSchema", schemaCode);
          valid = (0, codegen_1.or)(...schema.map((_x, i) => equalCode(vSchema, i)));
        }
        cxt.pass(valid);
        function loopEnum() {
          gen.assign(valid, false);
          gen.forOf("v", schemaCode, (v) => gen.if((0, codegen_1._)`${getEql()}(${data}, ${v})`, () => gen.assign(valid, true).break()));
        }
        function equalCode(vSchema, i) {
          const sch = schema[i];
          return typeof sch === "object" && sch !== null ? (0, codegen_1._)`${getEql()}(${data}, ${vSchema}[${i}])` : (0, codegen_1._)`${data} === ${sch}`;
        }
      }
    };
    exports2.default = def;
  }
});

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/validation/index.js
var require_validation = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/validation/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var limitNumber_1 = require_limitNumber();
    var multipleOf_1 = require_multipleOf();
    var limitLength_1 = require_limitLength();
    var pattern_1 = require_pattern();
    var limitProperties_1 = require_limitProperties();
    var required_1 = require_required();
    var limitItems_1 = require_limitItems();
    var uniqueItems_1 = require_uniqueItems();
    var const_1 = require_const();
    var enum_1 = require_enum();
    var validation = [
      // number
      limitNumber_1.default,
      multipleOf_1.default,
      // string
      limitLength_1.default,
      pattern_1.default,
      // object
      limitProperties_1.default,
      required_1.default,
      // array
      limitItems_1.default,
      uniqueItems_1.default,
      // any
      { keyword: "type", schemaType: ["string", "array"] },
      { keyword: "nullable", schemaType: "boolean" },
      const_1.default,
      enum_1.default
    ];
    exports2.default = validation;
  }
});

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/applicator/additionalItems.js
var require_additionalItems = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/applicator/additionalItems.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.validateAdditionalItems = void 0;
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var error = {
      message: ({ params: { len } }) => (0, codegen_1.str)`must NOT have more than ${len} items`,
      params: ({ params: { len } }) => (0, codegen_1._)`{limit: ${len}}`
    };
    var def = {
      keyword: "additionalItems",
      type: "array",
      schemaType: ["boolean", "object"],
      before: "uniqueItems",
      error,
      code(cxt) {
        const { parentSchema, it } = cxt;
        const { items } = parentSchema;
        if (!Array.isArray(items)) {
          (0, util_1.checkStrictMode)(it, '"additionalItems" is ignored when "items" is not an array of schemas');
          return;
        }
        validateAdditionalItems(cxt, items);
      }
    };
    function validateAdditionalItems(cxt, items) {
      const { gen, schema, data, keyword, it } = cxt;
      it.items = true;
      const len = gen.const("len", (0, codegen_1._)`${data}.length`);
      if (schema === false) {
        cxt.setParams({ len: items.length });
        cxt.pass((0, codegen_1._)`${len} <= ${items.length}`);
      } else if (typeof schema == "object" && !(0, util_1.alwaysValidSchema)(it, schema)) {
        const valid = gen.var("valid", (0, codegen_1._)`${len} <= ${items.length}`);
        gen.if((0, codegen_1.not)(valid), () => validateItems(valid));
        cxt.ok(valid);
      }
      function validateItems(valid) {
        gen.forRange("i", items.length, len, (i) => {
          cxt.subschema({ keyword, dataProp: i, dataPropType: util_1.Type.Num }, valid);
          if (!it.allErrors)
            gen.if((0, codegen_1.not)(valid), () => gen.break());
        });
      }
    }
    exports2.validateAdditionalItems = validateAdditionalItems;
    exports2.default = def;
  }
});

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/applicator/items.js
var require_items = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/applicator/items.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.validateTuple = void 0;
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var code_1 = require_code2();
    var def = {
      keyword: "items",
      type: "array",
      schemaType: ["object", "array", "boolean"],
      before: "uniqueItems",
      code(cxt) {
        const { schema, it } = cxt;
        if (Array.isArray(schema))
          return validateTuple(cxt, "additionalItems", schema);
        it.items = true;
        if ((0, util_1.alwaysValidSchema)(it, schema))
          return;
        cxt.ok((0, code_1.validateArray)(cxt));
      }
    };
    function validateTuple(cxt, extraItems, schArr = cxt.schema) {
      const { gen, parentSchema, data, keyword, it } = cxt;
      checkStrictTuple(parentSchema);
      if (it.opts.unevaluated && schArr.length && it.items !== true) {
        it.items = util_1.mergeEvaluated.items(gen, schArr.length, it.items);
      }
      const valid = gen.name("valid");
      const len = gen.const("len", (0, codegen_1._)`${data}.length`);
      schArr.forEach((sch, i) => {
        if ((0, util_1.alwaysValidSchema)(it, sch))
          return;
        gen.if((0, codegen_1._)`${len} > ${i}`, () => cxt.subschema({
          keyword,
          schemaProp: i,
          dataProp: i
        }, valid));
        cxt.ok(valid);
      });
      function checkStrictTuple(sch) {
        const { opts, errSchemaPath } = it;
        const l = schArr.length;
        const fullTuple = l === sch.minItems && (l === sch.maxItems || sch[extraItems] === false);
        if (opts.strictTuples && !fullTuple) {
          const msg = `"${keyword}" is ${l}-tuple, but minItems or maxItems/${extraItems} are not specified or different at path "${errSchemaPath}"`;
          (0, util_1.checkStrictMode)(it, msg, opts.strictTuples);
        }
      }
    }
    exports2.validateTuple = validateTuple;
    exports2.default = def;
  }
});

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/applicator/prefixItems.js
var require_prefixItems = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/applicator/prefixItems.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var items_1 = require_items();
    var def = {
      keyword: "prefixItems",
      type: "array",
      schemaType: ["array"],
      before: "uniqueItems",
      code: (cxt) => (0, items_1.validateTuple)(cxt, "items")
    };
    exports2.default = def;
  }
});

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/applicator/items2020.js
var require_items2020 = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/applicator/items2020.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var code_1 = require_code2();
    var additionalItems_1 = require_additionalItems();
    var error = {
      message: ({ params: { len } }) => (0, codegen_1.str)`must NOT have more than ${len} items`,
      params: ({ params: { len } }) => (0, codegen_1._)`{limit: ${len}}`
    };
    var def = {
      keyword: "items",
      type: "array",
      schemaType: ["object", "boolean"],
      before: "uniqueItems",
      error,
      code(cxt) {
        const { schema, parentSchema, it } = cxt;
        const { prefixItems } = parentSchema;
        it.items = true;
        if ((0, util_1.alwaysValidSchema)(it, schema))
          return;
        if (prefixItems)
          (0, additionalItems_1.validateAdditionalItems)(cxt, prefixItems);
        else
          cxt.ok((0, code_1.validateArray)(cxt));
      }
    };
    exports2.default = def;
  }
});

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/applicator/contains.js
var require_contains = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/applicator/contains.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var error = {
      message: ({ params: { min, max } }) => max === void 0 ? (0, codegen_1.str)`must contain at least ${min} valid item(s)` : (0, codegen_1.str)`must contain at least ${min} and no more than ${max} valid item(s)`,
      params: ({ params: { min, max } }) => max === void 0 ? (0, codegen_1._)`{minContains: ${min}}` : (0, codegen_1._)`{minContains: ${min}, maxContains: ${max}}`
    };
    var def = {
      keyword: "contains",
      type: "array",
      schemaType: ["object", "boolean"],
      before: "uniqueItems",
      trackErrors: true,
      error,
      code(cxt) {
        const { gen, schema, parentSchema, data, it } = cxt;
        let min;
        let max;
        const { minContains, maxContains } = parentSchema;
        if (it.opts.next) {
          min = minContains === void 0 ? 1 : minContains;
          max = maxContains;
        } else {
          min = 1;
        }
        const len = gen.const("len", (0, codegen_1._)`${data}.length`);
        cxt.setParams({ min, max });
        if (max === void 0 && min === 0) {
          (0, util_1.checkStrictMode)(it, `"minContains" == 0 without "maxContains": "contains" keyword ignored`);
          return;
        }
        if (max !== void 0 && min > max) {
          (0, util_1.checkStrictMode)(it, `"minContains" > "maxContains" is always invalid`);
          cxt.fail();
          return;
        }
        if ((0, util_1.alwaysValidSchema)(it, schema)) {
          let cond = (0, codegen_1._)`${len} >= ${min}`;
          if (max !== void 0)
            cond = (0, codegen_1._)`${cond} && ${len} <= ${max}`;
          cxt.pass(cond);
          return;
        }
        it.items = true;
        const valid = gen.name("valid");
        if (max === void 0 && min === 1) {
          validateItems(valid, () => gen.if(valid, () => gen.break()));
        } else if (min === 0) {
          gen.let(valid, true);
          if (max !== void 0)
            gen.if((0, codegen_1._)`${data}.length > 0`, validateItemsWithCount);
        } else {
          gen.let(valid, false);
          validateItemsWithCount();
        }
        cxt.result(valid, () => cxt.reset());
        function validateItemsWithCount() {
          const schValid = gen.name("_valid");
          const count = gen.let("count", 0);
          validateItems(schValid, () => gen.if(schValid, () => checkLimits(count)));
        }
        function validateItems(_valid, block) {
          gen.forRange("i", 0, len, (i) => {
            cxt.subschema({
              keyword: "contains",
              dataProp: i,
              dataPropType: util_1.Type.Num,
              compositeRule: true
            }, _valid);
            block();
          });
        }
        function checkLimits(count) {
          gen.code((0, codegen_1._)`${count}++`);
          if (max === void 0) {
            gen.if((0, codegen_1._)`${count} >= ${min}`, () => gen.assign(valid, true).break());
          } else {
            gen.if((0, codegen_1._)`${count} > ${max}`, () => gen.assign(valid, false).break());
            if (min === 1)
              gen.assign(valid, true);
            else
              gen.if((0, codegen_1._)`${count} >= ${min}`, () => gen.assign(valid, true));
          }
        }
      }
    };
    exports2.default = def;
  }
});

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/applicator/dependencies.js
var require_dependencies = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/applicator/dependencies.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.validateSchemaDeps = exports2.validatePropertyDeps = exports2.error = void 0;
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var code_1 = require_code2();
    exports2.error = {
      message: ({ params: { property, depsCount, deps } }) => {
        const property_ies = depsCount === 1 ? "property" : "properties";
        return (0, codegen_1.str)`must have ${property_ies} ${deps} when property ${property} is present`;
      },
      params: ({ params: { property, depsCount, deps, missingProperty } }) => (0, codegen_1._)`{property: ${property},
    missingProperty: ${missingProperty},
    depsCount: ${depsCount},
    deps: ${deps}}`
      // TODO change to reference
    };
    var def = {
      keyword: "dependencies",
      type: "object",
      schemaType: "object",
      error: exports2.error,
      code(cxt) {
        const [propDeps, schDeps] = splitDependencies(cxt);
        validatePropertyDeps(cxt, propDeps);
        validateSchemaDeps(cxt, schDeps);
      }
    };
    function splitDependencies({ schema }) {
      const propertyDeps = {};
      const schemaDeps = {};
      for (const key in schema) {
        if (key === "__proto__")
          continue;
        const deps = Array.isArray(schema[key]) ? propertyDeps : schemaDeps;
        deps[key] = schema[key];
      }
      return [propertyDeps, schemaDeps];
    }
    function validatePropertyDeps(cxt, propertyDeps = cxt.schema) {
      const { gen, data, it } = cxt;
      if (Object.keys(propertyDeps).length === 0)
        return;
      const missing = gen.let("missing");
      for (const prop in propertyDeps) {
        const deps = propertyDeps[prop];
        if (deps.length === 0)
          continue;
        const hasProperty = (0, code_1.propertyInData)(gen, data, prop, it.opts.ownProperties);
        cxt.setParams({
          property: prop,
          depsCount: deps.length,
          deps: deps.join(", ")
        });
        if (it.allErrors) {
          gen.if(hasProperty, () => {
            for (const depProp of deps) {
              (0, code_1.checkReportMissingProp)(cxt, depProp);
            }
          });
        } else {
          gen.if((0, codegen_1._)`${hasProperty} && (${(0, code_1.checkMissingProp)(cxt, deps, missing)})`);
          (0, code_1.reportMissingProp)(cxt, missing);
          gen.else();
        }
      }
    }
    exports2.validatePropertyDeps = validatePropertyDeps;
    function validateSchemaDeps(cxt, schemaDeps = cxt.schema) {
      const { gen, data, keyword, it } = cxt;
      const valid = gen.name("valid");
      for (const prop in schemaDeps) {
        if ((0, util_1.alwaysValidSchema)(it, schemaDeps[prop]))
          continue;
        gen.if(
          (0, code_1.propertyInData)(gen, data, prop, it.opts.ownProperties),
          () => {
            const schCxt = cxt.subschema({ keyword, schemaProp: prop }, valid);
            cxt.mergeValidEvaluated(schCxt, valid);
          },
          () => gen.var(valid, true)
          // TODO var
        );
        cxt.ok(valid);
      }
    }
    exports2.validateSchemaDeps = validateSchemaDeps;
    exports2.default = def;
  }
});

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/applicator/propertyNames.js
var require_propertyNames = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/applicator/propertyNames.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var error = {
      message: "property name must be valid",
      params: ({ params }) => (0, codegen_1._)`{propertyName: ${params.propertyName}}`
    };
    var def = {
      keyword: "propertyNames",
      type: "object",
      schemaType: ["object", "boolean"],
      error,
      code(cxt) {
        const { gen, schema, data, it } = cxt;
        if ((0, util_1.alwaysValidSchema)(it, schema))
          return;
        const valid = gen.name("valid");
        gen.forIn("key", data, (key) => {
          cxt.setParams({ propertyName: key });
          cxt.subschema({
            keyword: "propertyNames",
            data: key,
            dataTypes: ["string"],
            propertyName: key,
            compositeRule: true
          }, valid);
          gen.if((0, codegen_1.not)(valid), () => {
            cxt.error(true);
            if (!it.allErrors)
              gen.break();
          });
        });
        cxt.ok(valid);
      }
    };
    exports2.default = def;
  }
});

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/applicator/additionalProperties.js
var require_additionalProperties = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/applicator/additionalProperties.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var code_1 = require_code2();
    var codegen_1 = require_codegen();
    var names_1 = require_names();
    var util_1 = require_util();
    var error = {
      message: "must NOT have additional properties",
      params: ({ params }) => (0, codegen_1._)`{additionalProperty: ${params.additionalProperty}}`
    };
    var def = {
      keyword: "additionalProperties",
      type: ["object"],
      schemaType: ["boolean", "object"],
      allowUndefined: true,
      trackErrors: true,
      error,
      code(cxt) {
        const { gen, schema, parentSchema, data, errsCount, it } = cxt;
        if (!errsCount)
          throw new Error("ajv implementation error");
        const { allErrors, opts } = it;
        it.props = true;
        if (opts.removeAdditional !== "all" && (0, util_1.alwaysValidSchema)(it, schema))
          return;
        const props = (0, code_1.allSchemaProperties)(parentSchema.properties);
        const patProps = (0, code_1.allSchemaProperties)(parentSchema.patternProperties);
        checkAdditionalProperties();
        cxt.ok((0, codegen_1._)`${errsCount} === ${names_1.default.errors}`);
        function checkAdditionalProperties() {
          gen.forIn("key", data, (key) => {
            if (!props.length && !patProps.length)
              additionalPropertyCode(key);
            else
              gen.if(isAdditional(key), () => additionalPropertyCode(key));
          });
        }
        function isAdditional(key) {
          let definedProp;
          if (props.length > 8) {
            const propsSchema = (0, util_1.schemaRefOrVal)(it, parentSchema.properties, "properties");
            definedProp = (0, code_1.isOwnProperty)(gen, propsSchema, key);
          } else if (props.length) {
            definedProp = (0, codegen_1.or)(...props.map((p) => (0, codegen_1._)`${key} === ${p}`));
          } else {
            definedProp = codegen_1.nil;
          }
          if (patProps.length) {
            definedProp = (0, codegen_1.or)(definedProp, ...patProps.map((p) => (0, codegen_1._)`${(0, code_1.usePattern)(cxt, p)}.test(${key})`));
          }
          return (0, codegen_1.not)(definedProp);
        }
        function deleteAdditional(key) {
          gen.code((0, codegen_1._)`delete ${data}[${key}]`);
        }
        function additionalPropertyCode(key) {
          if (opts.removeAdditional === "all" || opts.removeAdditional && schema === false) {
            deleteAdditional(key);
            return;
          }
          if (schema === false) {
            cxt.setParams({ additionalProperty: key });
            cxt.error();
            if (!allErrors)
              gen.break();
            return;
          }
          if (typeof schema == "object" && !(0, util_1.alwaysValidSchema)(it, schema)) {
            const valid = gen.name("valid");
            if (opts.removeAdditional === "failing") {
              applyAdditionalSchema(key, valid, false);
              gen.if((0, codegen_1.not)(valid), () => {
                cxt.reset();
                deleteAdditional(key);
              });
            } else {
              applyAdditionalSchema(key, valid);
              if (!allErrors)
                gen.if((0, codegen_1.not)(valid), () => gen.break());
            }
          }
        }
        function applyAdditionalSchema(key, valid, errors) {
          const subschema = {
            keyword: "additionalProperties",
            dataProp: key,
            dataPropType: util_1.Type.Str
          };
          if (errors === false) {
            Object.assign(subschema, {
              compositeRule: true,
              createErrors: false,
              allErrors: false
            });
          }
          cxt.subschema(subschema, valid);
        }
      }
    };
    exports2.default = def;
  }
});

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/applicator/properties.js
var require_properties = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/applicator/properties.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var validate_1 = require_validate();
    var code_1 = require_code2();
    var util_1 = require_util();
    var additionalProperties_1 = require_additionalProperties();
    var def = {
      keyword: "properties",
      type: "object",
      schemaType: "object",
      code(cxt) {
        const { gen, schema, parentSchema, data, it } = cxt;
        if (it.opts.removeAdditional === "all" && parentSchema.additionalProperties === void 0) {
          additionalProperties_1.default.code(new validate_1.KeywordCxt(it, additionalProperties_1.default, "additionalProperties"));
        }
        const allProps = (0, code_1.allSchemaProperties)(schema);
        for (const prop of allProps) {
          it.definedProperties.add(prop);
        }
        if (it.opts.unevaluated && allProps.length && it.props !== true) {
          it.props = util_1.mergeEvaluated.props(gen, (0, util_1.toHash)(allProps), it.props);
        }
        const properties = allProps.filter((p) => !(0, util_1.alwaysValidSchema)(it, schema[p]));
        if (properties.length === 0)
          return;
        const valid = gen.name("valid");
        for (const prop of properties) {
          if (hasDefault(prop)) {
            applyPropertySchema(prop);
          } else {
            gen.if((0, code_1.propertyInData)(gen, data, prop, it.opts.ownProperties));
            applyPropertySchema(prop);
            if (!it.allErrors)
              gen.else().var(valid, true);
            gen.endIf();
          }
          cxt.it.definedProperties.add(prop);
          cxt.ok(valid);
        }
        function hasDefault(prop) {
          return it.opts.useDefaults && !it.compositeRule && schema[prop].default !== void 0;
        }
        function applyPropertySchema(prop) {
          cxt.subschema({
            keyword: "properties",
            schemaProp: prop,
            dataProp: prop
          }, valid);
        }
      }
    };
    exports2.default = def;
  }
});

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/applicator/patternProperties.js
var require_patternProperties = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/applicator/patternProperties.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var code_1 = require_code2();
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var util_2 = require_util();
    var def = {
      keyword: "patternProperties",
      type: "object",
      schemaType: "object",
      code(cxt) {
        const { gen, schema, data, parentSchema, it } = cxt;
        const { opts } = it;
        const patterns = (0, code_1.allSchemaProperties)(schema);
        const alwaysValidPatterns = patterns.filter((p) => (0, util_1.alwaysValidSchema)(it, schema[p]));
        if (patterns.length === 0 || alwaysValidPatterns.length === patterns.length && (!it.opts.unevaluated || it.props === true)) {
          return;
        }
        const checkProperties = opts.strictSchema && !opts.allowMatchingProperties && parentSchema.properties;
        const valid = gen.name("valid");
        if (it.props !== true && !(it.props instanceof codegen_1.Name)) {
          it.props = (0, util_2.evaluatedPropsToName)(gen, it.props);
        }
        const { props } = it;
        validatePatternProperties();
        function validatePatternProperties() {
          for (const pat of patterns) {
            if (checkProperties)
              checkMatchingProperties(pat);
            if (it.allErrors) {
              validateProperties(pat);
            } else {
              gen.var(valid, true);
              validateProperties(pat);
              gen.if(valid);
            }
          }
        }
        function checkMatchingProperties(pat) {
          for (const prop in checkProperties) {
            if (new RegExp(pat).test(prop)) {
              (0, util_1.checkStrictMode)(it, `property ${prop} matches pattern ${pat} (use allowMatchingProperties)`);
            }
          }
        }
        function validateProperties(pat) {
          gen.forIn("key", data, (key) => {
            gen.if((0, codegen_1._)`${(0, code_1.usePattern)(cxt, pat)}.test(${key})`, () => {
              const alwaysValid = alwaysValidPatterns.includes(pat);
              if (!alwaysValid) {
                cxt.subschema({
                  keyword: "patternProperties",
                  schemaProp: pat,
                  dataProp: key,
                  dataPropType: util_2.Type.Str
                }, valid);
              }
              if (it.opts.unevaluated && props !== true) {
                gen.assign((0, codegen_1._)`${props}[${key}]`, true);
              } else if (!alwaysValid && !it.allErrors) {
                gen.if((0, codegen_1.not)(valid), () => gen.break());
              }
            });
          });
        }
      }
    };
    exports2.default = def;
  }
});

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/applicator/not.js
var require_not = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/applicator/not.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var util_1 = require_util();
    var def = {
      keyword: "not",
      schemaType: ["object", "boolean"],
      trackErrors: true,
      code(cxt) {
        const { gen, schema, it } = cxt;
        if ((0, util_1.alwaysValidSchema)(it, schema)) {
          cxt.fail();
          return;
        }
        const valid = gen.name("valid");
        cxt.subschema({
          keyword: "not",
          compositeRule: true,
          createErrors: false,
          allErrors: false
        }, valid);
        cxt.failResult(valid, () => cxt.reset(), () => cxt.error());
      },
      error: { message: "must NOT be valid" }
    };
    exports2.default = def;
  }
});

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/applicator/anyOf.js
var require_anyOf = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/applicator/anyOf.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var code_1 = require_code2();
    var def = {
      keyword: "anyOf",
      schemaType: "array",
      trackErrors: true,
      code: code_1.validateUnion,
      error: { message: "must match a schema in anyOf" }
    };
    exports2.default = def;
  }
});

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/applicator/oneOf.js
var require_oneOf = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/applicator/oneOf.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var error = {
      message: "must match exactly one schema in oneOf",
      params: ({ params }) => (0, codegen_1._)`{passingSchemas: ${params.passing}}`
    };
    var def = {
      keyword: "oneOf",
      schemaType: "array",
      trackErrors: true,
      error,
      code(cxt) {
        const { gen, schema, parentSchema, it } = cxt;
        if (!Array.isArray(schema))
          throw new Error("ajv implementation error");
        if (it.opts.discriminator && parentSchema.discriminator)
          return;
        const schArr = schema;
        const valid = gen.let("valid", false);
        const passing = gen.let("passing", null);
        const schValid = gen.name("_valid");
        cxt.setParams({ passing });
        gen.block(validateOneOf);
        cxt.result(valid, () => cxt.reset(), () => cxt.error(true));
        function validateOneOf() {
          schArr.forEach((sch, i) => {
            let schCxt;
            if ((0, util_1.alwaysValidSchema)(it, sch)) {
              gen.var(schValid, true);
            } else {
              schCxt = cxt.subschema({
                keyword: "oneOf",
                schemaProp: i,
                compositeRule: true
              }, schValid);
            }
            if (i > 0) {
              gen.if((0, codegen_1._)`${schValid} && ${valid}`).assign(valid, false).assign(passing, (0, codegen_1._)`[${passing}, ${i}]`).else();
            }
            gen.if(schValid, () => {
              gen.assign(valid, true);
              gen.assign(passing, i);
              if (schCxt)
                cxt.mergeEvaluated(schCxt, codegen_1.Name);
            });
          });
        }
      }
    };
    exports2.default = def;
  }
});

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/applicator/allOf.js
var require_allOf = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/applicator/allOf.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var util_1 = require_util();
    var def = {
      keyword: "allOf",
      schemaType: "array",
      code(cxt) {
        const { gen, schema, it } = cxt;
        if (!Array.isArray(schema))
          throw new Error("ajv implementation error");
        const valid = gen.name("valid");
        schema.forEach((sch, i) => {
          if ((0, util_1.alwaysValidSchema)(it, sch))
            return;
          const schCxt = cxt.subschema({ keyword: "allOf", schemaProp: i }, valid);
          cxt.ok(valid);
          cxt.mergeEvaluated(schCxt);
        });
      }
    };
    exports2.default = def;
  }
});

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/applicator/if.js
var require_if = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/applicator/if.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var error = {
      message: ({ params }) => (0, codegen_1.str)`must match "${params.ifClause}" schema`,
      params: ({ params }) => (0, codegen_1._)`{failingKeyword: ${params.ifClause}}`
    };
    var def = {
      keyword: "if",
      schemaType: ["object", "boolean"],
      trackErrors: true,
      error,
      code(cxt) {
        const { gen, parentSchema, it } = cxt;
        if (parentSchema.then === void 0 && parentSchema.else === void 0) {
          (0, util_1.checkStrictMode)(it, '"if" without "then" and "else" is ignored');
        }
        const hasThen = hasSchema(it, "then");
        const hasElse = hasSchema(it, "else");
        if (!hasThen && !hasElse)
          return;
        const valid = gen.let("valid", true);
        const schValid = gen.name("_valid");
        validateIf();
        cxt.reset();
        if (hasThen && hasElse) {
          const ifClause = gen.let("ifClause");
          cxt.setParams({ ifClause });
          gen.if(schValid, validateClause("then", ifClause), validateClause("else", ifClause));
        } else if (hasThen) {
          gen.if(schValid, validateClause("then"));
        } else {
          gen.if((0, codegen_1.not)(schValid), validateClause("else"));
        }
        cxt.pass(valid, () => cxt.error(true));
        function validateIf() {
          const schCxt = cxt.subschema({
            keyword: "if",
            compositeRule: true,
            createErrors: false,
            allErrors: false
          }, schValid);
          cxt.mergeEvaluated(schCxt);
        }
        function validateClause(keyword, ifClause) {
          return () => {
            const schCxt = cxt.subschema({ keyword }, schValid);
            gen.assign(valid, schValid);
            cxt.mergeValidEvaluated(schCxt, valid);
            if (ifClause)
              gen.assign(ifClause, (0, codegen_1._)`${keyword}`);
            else
              cxt.setParams({ ifClause: keyword });
          };
        }
      }
    };
    function hasSchema(it, keyword) {
      const schema = it.schema[keyword];
      return schema !== void 0 && !(0, util_1.alwaysValidSchema)(it, schema);
    }
    exports2.default = def;
  }
});

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/applicator/thenElse.js
var require_thenElse = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/applicator/thenElse.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var util_1 = require_util();
    var def = {
      keyword: ["then", "else"],
      schemaType: ["object", "boolean"],
      code({ keyword, parentSchema, it }) {
        if (parentSchema.if === void 0)
          (0, util_1.checkStrictMode)(it, `"${keyword}" without "if" is ignored`);
      }
    };
    exports2.default = def;
  }
});

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/applicator/index.js
var require_applicator = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/applicator/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var additionalItems_1 = require_additionalItems();
    var prefixItems_1 = require_prefixItems();
    var items_1 = require_items();
    var items2020_1 = require_items2020();
    var contains_1 = require_contains();
    var dependencies_1 = require_dependencies();
    var propertyNames_1 = require_propertyNames();
    var additionalProperties_1 = require_additionalProperties();
    var properties_1 = require_properties();
    var patternProperties_1 = require_patternProperties();
    var not_1 = require_not();
    var anyOf_1 = require_anyOf();
    var oneOf_1 = require_oneOf();
    var allOf_1 = require_allOf();
    var if_1 = require_if();
    var thenElse_1 = require_thenElse();
    function getApplicator(draft2020 = false) {
      const applicator = [
        // any
        not_1.default,
        anyOf_1.default,
        oneOf_1.default,
        allOf_1.default,
        if_1.default,
        thenElse_1.default,
        // object
        propertyNames_1.default,
        additionalProperties_1.default,
        dependencies_1.default,
        properties_1.default,
        patternProperties_1.default
      ];
      if (draft2020)
        applicator.push(prefixItems_1.default, items2020_1.default);
      else
        applicator.push(additionalItems_1.default, items_1.default);
      applicator.push(contains_1.default);
      return applicator;
    }
    exports2.default = getApplicator;
  }
});

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/dynamic/dynamicAnchor.js
var require_dynamicAnchor = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/dynamic/dynamicAnchor.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.dynamicAnchor = void 0;
    var codegen_1 = require_codegen();
    var names_1 = require_names();
    var compile_1 = require_compile();
    var ref_1 = require_ref();
    var def = {
      keyword: "$dynamicAnchor",
      schemaType: "string",
      code: (cxt) => dynamicAnchor(cxt, cxt.schema)
    };
    function dynamicAnchor(cxt, anchor) {
      const { gen, it } = cxt;
      it.schemaEnv.root.dynamicAnchors[anchor] = true;
      const v = (0, codegen_1._)`${names_1.default.dynamicAnchors}${(0, codegen_1.getProperty)(anchor)}`;
      const validate = it.errSchemaPath === "#" ? it.validateName : _getValidate(cxt);
      gen.if((0, codegen_1._)`!${v}`, () => gen.assign(v, validate));
    }
    exports2.dynamicAnchor = dynamicAnchor;
    function _getValidate(cxt) {
      const { schemaEnv, schema, self } = cxt.it;
      const { root, baseId, localRefs, meta } = schemaEnv.root;
      const { schemaId } = self.opts;
      const sch = new compile_1.SchemaEnv({ schema, schemaId, root, baseId, localRefs, meta });
      compile_1.compileSchema.call(self, sch);
      return (0, ref_1.getValidate)(cxt, sch);
    }
    exports2.default = def;
  }
});

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/dynamic/dynamicRef.js
var require_dynamicRef = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/dynamic/dynamicRef.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.dynamicRef = void 0;
    var codegen_1 = require_codegen();
    var names_1 = require_names();
    var ref_1 = require_ref();
    var def = {
      keyword: "$dynamicRef",
      schemaType: "string",
      code: (cxt) => dynamicRef(cxt, cxt.schema)
    };
    function dynamicRef(cxt, ref) {
      const { gen, keyword, it } = cxt;
      if (ref[0] !== "#")
        throw new Error(`"${keyword}" only supports hash fragment reference`);
      const anchor = ref.slice(1);
      if (it.allErrors) {
        _dynamicRef();
      } else {
        const valid = gen.let("valid", false);
        _dynamicRef(valid);
        cxt.ok(valid);
      }
      function _dynamicRef(valid) {
        if (it.schemaEnv.root.dynamicAnchors[anchor]) {
          const v = gen.let("_v", (0, codegen_1._)`${names_1.default.dynamicAnchors}${(0, codegen_1.getProperty)(anchor)}`);
          gen.if(v, _callRef(v, valid), _callRef(it.validateName, valid));
        } else {
          _callRef(it.validateName, valid)();
        }
      }
      function _callRef(validate, valid) {
        return valid ? () => gen.block(() => {
          (0, ref_1.callRef)(cxt, validate);
          gen.let(valid, true);
        }) : () => (0, ref_1.callRef)(cxt, validate);
      }
    }
    exports2.dynamicRef = dynamicRef;
    exports2.default = def;
  }
});

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/dynamic/recursiveAnchor.js
var require_recursiveAnchor = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/dynamic/recursiveAnchor.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var dynamicAnchor_1 = require_dynamicAnchor();
    var util_1 = require_util();
    var def = {
      keyword: "$recursiveAnchor",
      schemaType: "boolean",
      code(cxt) {
        if (cxt.schema)
          (0, dynamicAnchor_1.dynamicAnchor)(cxt, "");
        else
          (0, util_1.checkStrictMode)(cxt.it, "$recursiveAnchor: false is ignored");
      }
    };
    exports2.default = def;
  }
});

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/dynamic/recursiveRef.js
var require_recursiveRef = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/dynamic/recursiveRef.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var dynamicRef_1 = require_dynamicRef();
    var def = {
      keyword: "$recursiveRef",
      schemaType: "string",
      code: (cxt) => (0, dynamicRef_1.dynamicRef)(cxt, cxt.schema)
    };
    exports2.default = def;
  }
});

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/dynamic/index.js
var require_dynamic = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/dynamic/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var dynamicAnchor_1 = require_dynamicAnchor();
    var dynamicRef_1 = require_dynamicRef();
    var recursiveAnchor_1 = require_recursiveAnchor();
    var recursiveRef_1 = require_recursiveRef();
    var dynamic = [dynamicAnchor_1.default, dynamicRef_1.default, recursiveAnchor_1.default, recursiveRef_1.default];
    exports2.default = dynamic;
  }
});

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/validation/dependentRequired.js
var require_dependentRequired = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/validation/dependentRequired.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var dependencies_1 = require_dependencies();
    var def = {
      keyword: "dependentRequired",
      type: "object",
      schemaType: "object",
      error: dependencies_1.error,
      code: (cxt) => (0, dependencies_1.validatePropertyDeps)(cxt)
    };
    exports2.default = def;
  }
});

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/applicator/dependentSchemas.js
var require_dependentSchemas = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/applicator/dependentSchemas.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var dependencies_1 = require_dependencies();
    var def = {
      keyword: "dependentSchemas",
      type: "object",
      schemaType: "object",
      code: (cxt) => (0, dependencies_1.validateSchemaDeps)(cxt)
    };
    exports2.default = def;
  }
});

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/validation/limitContains.js
var require_limitContains = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/validation/limitContains.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var util_1 = require_util();
    var def = {
      keyword: ["maxContains", "minContains"],
      type: "array",
      schemaType: "number",
      code({ keyword, parentSchema, it }) {
        if (parentSchema.contains === void 0) {
          (0, util_1.checkStrictMode)(it, `"${keyword}" without "contains" is ignored`);
        }
      }
    };
    exports2.default = def;
  }
});

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/next.js
var require_next = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/next.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var dependentRequired_1 = require_dependentRequired();
    var dependentSchemas_1 = require_dependentSchemas();
    var limitContains_1 = require_limitContains();
    var next = [dependentRequired_1.default, dependentSchemas_1.default, limitContains_1.default];
    exports2.default = next;
  }
});

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/unevaluated/unevaluatedProperties.js
var require_unevaluatedProperties = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/unevaluated/unevaluatedProperties.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var names_1 = require_names();
    var error = {
      message: "must NOT have unevaluated properties",
      params: ({ params }) => (0, codegen_1._)`{unevaluatedProperty: ${params.unevaluatedProperty}}`
    };
    var def = {
      keyword: "unevaluatedProperties",
      type: "object",
      schemaType: ["boolean", "object"],
      trackErrors: true,
      error,
      code(cxt) {
        const { gen, schema, data, errsCount, it } = cxt;
        if (!errsCount)
          throw new Error("ajv implementation error");
        const { allErrors, props } = it;
        if (props instanceof codegen_1.Name) {
          gen.if((0, codegen_1._)`${props} !== true`, () => gen.forIn("key", data, (key) => gen.if(unevaluatedDynamic(props, key), () => unevaluatedPropCode(key))));
        } else if (props !== true) {
          gen.forIn("key", data, (key) => props === void 0 ? unevaluatedPropCode(key) : gen.if(unevaluatedStatic(props, key), () => unevaluatedPropCode(key)));
        }
        it.props = true;
        cxt.ok((0, codegen_1._)`${errsCount} === ${names_1.default.errors}`);
        function unevaluatedPropCode(key) {
          if (schema === false) {
            cxt.setParams({ unevaluatedProperty: key });
            cxt.error();
            if (!allErrors)
              gen.break();
            return;
          }
          if (!(0, util_1.alwaysValidSchema)(it, schema)) {
            const valid = gen.name("valid");
            cxt.subschema({
              keyword: "unevaluatedProperties",
              dataProp: key,
              dataPropType: util_1.Type.Str
            }, valid);
            if (!allErrors)
              gen.if((0, codegen_1.not)(valid), () => gen.break());
          }
        }
        function unevaluatedDynamic(evaluatedProps, key) {
          return (0, codegen_1._)`!${evaluatedProps} || !${evaluatedProps}[${key}]`;
        }
        function unevaluatedStatic(evaluatedProps, key) {
          const ps = [];
          for (const p in evaluatedProps) {
            if (evaluatedProps[p] === true)
              ps.push((0, codegen_1._)`${key} !== ${p}`);
          }
          return (0, codegen_1.and)(...ps);
        }
      }
    };
    exports2.default = def;
  }
});

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/unevaluated/unevaluatedItems.js
var require_unevaluatedItems = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/unevaluated/unevaluatedItems.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var util_1 = require_util();
    var error = {
      message: ({ params: { len } }) => (0, codegen_1.str)`must NOT have more than ${len} items`,
      params: ({ params: { len } }) => (0, codegen_1._)`{limit: ${len}}`
    };
    var def = {
      keyword: "unevaluatedItems",
      type: "array",
      schemaType: ["boolean", "object"],
      error,
      code(cxt) {
        const { gen, schema, data, it } = cxt;
        const items = it.items || 0;
        if (items === true)
          return;
        const len = gen.const("len", (0, codegen_1._)`${data}.length`);
        if (schema === false) {
          cxt.setParams({ len: items });
          cxt.fail((0, codegen_1._)`${len} > ${items}`);
        } else if (typeof schema == "object" && !(0, util_1.alwaysValidSchema)(it, schema)) {
          const valid = gen.var("valid", (0, codegen_1._)`${len} <= ${items}`);
          gen.if((0, codegen_1.not)(valid), () => validateItems(valid, items));
          cxt.ok(valid);
        }
        it.items = true;
        function validateItems(valid, from) {
          gen.forRange("i", from, len, (i) => {
            cxt.subschema({ keyword: "unevaluatedItems", dataProp: i, dataPropType: util_1.Type.Num }, valid);
            if (!it.allErrors)
              gen.if((0, codegen_1.not)(valid), () => gen.break());
          });
        }
      }
    };
    exports2.default = def;
  }
});

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/unevaluated/index.js
var require_unevaluated = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/unevaluated/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var unevaluatedProperties_1 = require_unevaluatedProperties();
    var unevaluatedItems_1 = require_unevaluatedItems();
    var unevaluated = [unevaluatedProperties_1.default, unevaluatedItems_1.default];
    exports2.default = unevaluated;
  }
});

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/format/format.js
var require_format = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/format/format.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var error = {
      message: ({ schemaCode }) => (0, codegen_1.str)`must match format "${schemaCode}"`,
      params: ({ schemaCode }) => (0, codegen_1._)`{format: ${schemaCode}}`
    };
    var def = {
      keyword: "format",
      type: ["number", "string"],
      schemaType: "string",
      $data: true,
      error,
      code(cxt, ruleType) {
        const { gen, data, $data, schema, schemaCode, it } = cxt;
        const { opts, errSchemaPath, schemaEnv, self } = it;
        if (!opts.validateFormats)
          return;
        if ($data)
          validate$DataFormat();
        else
          validateFormat();
        function validate$DataFormat() {
          const fmts = gen.scopeValue("formats", {
            ref: self.formats,
            code: opts.code.formats
          });
          const fDef = gen.const("fDef", (0, codegen_1._)`${fmts}[${schemaCode}]`);
          const fType = gen.let("fType");
          const format = gen.let("format");
          gen.if((0, codegen_1._)`typeof ${fDef} == "object" && !(${fDef} instanceof RegExp)`, () => gen.assign(fType, (0, codegen_1._)`${fDef}.type || "string"`).assign(format, (0, codegen_1._)`${fDef}.validate`), () => gen.assign(fType, (0, codegen_1._)`"string"`).assign(format, fDef));
          cxt.fail$data((0, codegen_1.or)(unknownFmt(), invalidFmt()));
          function unknownFmt() {
            if (opts.strictSchema === false)
              return codegen_1.nil;
            return (0, codegen_1._)`${schemaCode} && !${format}`;
          }
          function invalidFmt() {
            const callFormat = schemaEnv.$async ? (0, codegen_1._)`(${fDef}.async ? await ${format}(${data}) : ${format}(${data}))` : (0, codegen_1._)`${format}(${data})`;
            const validData = (0, codegen_1._)`(typeof ${format} == "function" ? ${callFormat} : ${format}.test(${data}))`;
            return (0, codegen_1._)`${format} && ${format} !== true && ${fType} === ${ruleType} && !${validData}`;
          }
        }
        function validateFormat() {
          const formatDef = self.formats[schema];
          if (!formatDef) {
            unknownFormat();
            return;
          }
          if (formatDef === true)
            return;
          const [fmtType, format, fmtRef] = getFormat(formatDef);
          if (fmtType === ruleType)
            cxt.pass(validCondition());
          function unknownFormat() {
            if (opts.strictSchema === false) {
              self.logger.warn(unknownMsg());
              return;
            }
            throw new Error(unknownMsg());
            function unknownMsg() {
              return `unknown format "${schema}" ignored in schema at path "${errSchemaPath}"`;
            }
          }
          function getFormat(fmtDef) {
            const code = fmtDef instanceof RegExp ? (0, codegen_1.regexpCode)(fmtDef) : opts.code.formats ? (0, codegen_1._)`${opts.code.formats}${(0, codegen_1.getProperty)(schema)}` : void 0;
            const fmt = gen.scopeValue("formats", { key: schema, ref: fmtDef, code });
            if (typeof fmtDef == "object" && !(fmtDef instanceof RegExp)) {
              return [fmtDef.type || "string", fmtDef.validate, (0, codegen_1._)`${fmt}.validate`];
            }
            return ["string", fmtDef, fmt];
          }
          function validCondition() {
            if (typeof formatDef == "object" && !(formatDef instanceof RegExp) && formatDef.async) {
              if (!schemaEnv.$async)
                throw new Error("async format in sync schema");
              return (0, codegen_1._)`await ${fmtRef}(${data})`;
            }
            return typeof format == "function" ? (0, codegen_1._)`${fmtRef}(${data})` : (0, codegen_1._)`${fmtRef}.test(${data})`;
          }
        }
      }
    };
    exports2.default = def;
  }
});

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/format/index.js
var require_format2 = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/format/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var format_1 = require_format();
    var format = [format_1.default];
    exports2.default = format;
  }
});

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/metadata.js
var require_metadata = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/metadata.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.contentVocabulary = exports2.metadataVocabulary = void 0;
    exports2.metadataVocabulary = [
      "title",
      "description",
      "default",
      "deprecated",
      "readOnly",
      "writeOnly",
      "examples"
    ];
    exports2.contentVocabulary = [
      "contentMediaType",
      "contentEncoding",
      "contentSchema"
    ];
  }
});

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/draft2020.js
var require_draft2020 = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/draft2020.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var core_1 = require_core2();
    var validation_1 = require_validation();
    var applicator_1 = require_applicator();
    var dynamic_1 = require_dynamic();
    var next_1 = require_next();
    var unevaluated_1 = require_unevaluated();
    var format_1 = require_format2();
    var metadata_1 = require_metadata();
    var draft2020Vocabularies = [
      dynamic_1.default,
      core_1.default,
      validation_1.default,
      (0, applicator_1.default)(true),
      format_1.default,
      metadata_1.metadataVocabulary,
      metadata_1.contentVocabulary,
      next_1.default,
      unevaluated_1.default
    ];
    exports2.default = draft2020Vocabularies;
  }
});

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/discriminator/types.js
var require_types = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/discriminator/types.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.DiscrError = void 0;
    var DiscrError;
    (function(DiscrError2) {
      DiscrError2["Tag"] = "tag";
      DiscrError2["Mapping"] = "mapping";
    })(DiscrError || (exports2.DiscrError = DiscrError = {}));
  }
});

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/discriminator/index.js
var require_discriminator = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/discriminator/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var codegen_1 = require_codegen();
    var types_1 = require_types();
    var compile_1 = require_compile();
    var ref_error_1 = require_ref_error();
    var util_1 = require_util();
    var error = {
      message: ({ params: { discrError, tagName } }) => discrError === types_1.DiscrError.Tag ? `tag "${tagName}" must be string` : `value of tag "${tagName}" must be in oneOf`,
      params: ({ params: { discrError, tag, tagName } }) => (0, codegen_1._)`{error: ${discrError}, tag: ${tagName}, tagValue: ${tag}}`
    };
    var def = {
      keyword: "discriminator",
      type: "object",
      schemaType: "object",
      error,
      code(cxt) {
        const { gen, data, schema, parentSchema, it } = cxt;
        const { oneOf } = parentSchema;
        if (!it.opts.discriminator) {
          throw new Error("discriminator: requires discriminator option");
        }
        const tagName = schema.propertyName;
        if (typeof tagName != "string")
          throw new Error("discriminator: requires propertyName");
        if (schema.mapping)
          throw new Error("discriminator: mapping is not supported");
        if (!oneOf)
          throw new Error("discriminator: requires oneOf keyword");
        const valid = gen.let("valid", false);
        const tag = gen.const("tag", (0, codegen_1._)`${data}${(0, codegen_1.getProperty)(tagName)}`);
        gen.if((0, codegen_1._)`typeof ${tag} == "string"`, () => validateMapping(), () => cxt.error(false, { discrError: types_1.DiscrError.Tag, tag, tagName }));
        cxt.ok(valid);
        function validateMapping() {
          const mapping = getMapping();
          gen.if(false);
          for (const tagValue in mapping) {
            gen.elseIf((0, codegen_1._)`${tag} === ${tagValue}`);
            gen.assign(valid, applyTagSchema(mapping[tagValue]));
          }
          gen.else();
          cxt.error(false, { discrError: types_1.DiscrError.Mapping, tag, tagName });
          gen.endIf();
        }
        function applyTagSchema(schemaProp) {
          const _valid = gen.name("valid");
          const schCxt = cxt.subschema({ keyword: "oneOf", schemaProp }, _valid);
          cxt.mergeEvaluated(schCxt, codegen_1.Name);
          return _valid;
        }
        function getMapping() {
          var _a;
          const oneOfMapping = {};
          const topRequired = hasRequired(parentSchema);
          let tagRequired = true;
          for (let i = 0; i < oneOf.length; i++) {
            let sch = oneOf[i];
            if ((sch === null || sch === void 0 ? void 0 : sch.$ref) && !(0, util_1.schemaHasRulesButRef)(sch, it.self.RULES)) {
              const ref = sch.$ref;
              sch = compile_1.resolveRef.call(it.self, it.schemaEnv.root, it.baseId, ref);
              if (sch instanceof compile_1.SchemaEnv)
                sch = sch.schema;
              if (sch === void 0)
                throw new ref_error_1.default(it.opts.uriResolver, it.baseId, ref);
            }
            const propSch = (_a = sch === null || sch === void 0 ? void 0 : sch.properties) === null || _a === void 0 ? void 0 : _a[tagName];
            if (typeof propSch != "object") {
              throw new Error(`discriminator: oneOf subschemas (or referenced schemas) must have "properties/${tagName}"`);
            }
            tagRequired = tagRequired && (topRequired || hasRequired(sch));
            addMappings(propSch, i);
          }
          if (!tagRequired)
            throw new Error(`discriminator: "${tagName}" must be required`);
          return oneOfMapping;
          function hasRequired({ required }) {
            return Array.isArray(required) && required.includes(tagName);
          }
          function addMappings(sch, i) {
            if (sch.const) {
              addMapping(sch.const, i);
            } else if (sch.enum) {
              for (const tagValue of sch.enum) {
                addMapping(tagValue, i);
              }
            } else {
              throw new Error(`discriminator: "properties/${tagName}" must have "const" or "enum"`);
            }
          }
          function addMapping(tagValue, i) {
            if (typeof tagValue != "string" || tagValue in oneOfMapping) {
              throw new Error(`discriminator: "${tagName}" values must be unique strings`);
            }
            oneOfMapping[tagValue] = i;
          }
        }
      }
    };
    exports2.default = def;
  }
});

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/refs/json-schema-2020-12/schema.json
var require_schema = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/refs/json-schema-2020-12/schema.json"(exports2, module2) {
    module2.exports = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      $id: "https://json-schema.org/draft/2020-12/schema",
      $vocabulary: {
        "https://json-schema.org/draft/2020-12/vocab/core": true,
        "https://json-schema.org/draft/2020-12/vocab/applicator": true,
        "https://json-schema.org/draft/2020-12/vocab/unevaluated": true,
        "https://json-schema.org/draft/2020-12/vocab/validation": true,
        "https://json-schema.org/draft/2020-12/vocab/meta-data": true,
        "https://json-schema.org/draft/2020-12/vocab/format-annotation": true,
        "https://json-schema.org/draft/2020-12/vocab/content": true
      },
      $dynamicAnchor: "meta",
      title: "Core and Validation specifications meta-schema",
      allOf: [
        { $ref: "meta/core" },
        { $ref: "meta/applicator" },
        { $ref: "meta/unevaluated" },
        { $ref: "meta/validation" },
        { $ref: "meta/meta-data" },
        { $ref: "meta/format-annotation" },
        { $ref: "meta/content" }
      ],
      type: ["object", "boolean"],
      $comment: "This meta-schema also defines keywords that have appeared in previous drafts in order to prevent incompatible extensions as they remain in common use.",
      properties: {
        definitions: {
          $comment: '"definitions" has been replaced by "$defs".',
          type: "object",
          additionalProperties: { $dynamicRef: "#meta" },
          deprecated: true,
          default: {}
        },
        dependencies: {
          $comment: '"dependencies" has been split and replaced by "dependentSchemas" and "dependentRequired" in order to serve their differing semantics.',
          type: "object",
          additionalProperties: {
            anyOf: [{ $dynamicRef: "#meta" }, { $ref: "meta/validation#/$defs/stringArray" }]
          },
          deprecated: true,
          default: {}
        },
        $recursiveAnchor: {
          $comment: '"$recursiveAnchor" has been replaced by "$dynamicAnchor".',
          $ref: "meta/core#/$defs/anchorString",
          deprecated: true
        },
        $recursiveRef: {
          $comment: '"$recursiveRef" has been replaced by "$dynamicRef".',
          $ref: "meta/core#/$defs/uriReferenceString",
          deprecated: true
        }
      }
    };
  }
});

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/refs/json-schema-2020-12/meta/applicator.json
var require_applicator2 = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/refs/json-schema-2020-12/meta/applicator.json"(exports2, module2) {
    module2.exports = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      $id: "https://json-schema.org/draft/2020-12/meta/applicator",
      $vocabulary: {
        "https://json-schema.org/draft/2020-12/vocab/applicator": true
      },
      $dynamicAnchor: "meta",
      title: "Applicator vocabulary meta-schema",
      type: ["object", "boolean"],
      properties: {
        prefixItems: { $ref: "#/$defs/schemaArray" },
        items: { $dynamicRef: "#meta" },
        contains: { $dynamicRef: "#meta" },
        additionalProperties: { $dynamicRef: "#meta" },
        properties: {
          type: "object",
          additionalProperties: { $dynamicRef: "#meta" },
          default: {}
        },
        patternProperties: {
          type: "object",
          additionalProperties: { $dynamicRef: "#meta" },
          propertyNames: { format: "regex" },
          default: {}
        },
        dependentSchemas: {
          type: "object",
          additionalProperties: { $dynamicRef: "#meta" },
          default: {}
        },
        propertyNames: { $dynamicRef: "#meta" },
        if: { $dynamicRef: "#meta" },
        then: { $dynamicRef: "#meta" },
        else: { $dynamicRef: "#meta" },
        allOf: { $ref: "#/$defs/schemaArray" },
        anyOf: { $ref: "#/$defs/schemaArray" },
        oneOf: { $ref: "#/$defs/schemaArray" },
        not: { $dynamicRef: "#meta" }
      },
      $defs: {
        schemaArray: {
          type: "array",
          minItems: 1,
          items: { $dynamicRef: "#meta" }
        }
      }
    };
  }
});

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/refs/json-schema-2020-12/meta/unevaluated.json
var require_unevaluated2 = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/refs/json-schema-2020-12/meta/unevaluated.json"(exports2, module2) {
    module2.exports = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      $id: "https://json-schema.org/draft/2020-12/meta/unevaluated",
      $vocabulary: {
        "https://json-schema.org/draft/2020-12/vocab/unevaluated": true
      },
      $dynamicAnchor: "meta",
      title: "Unevaluated applicator vocabulary meta-schema",
      type: ["object", "boolean"],
      properties: {
        unevaluatedItems: { $dynamicRef: "#meta" },
        unevaluatedProperties: { $dynamicRef: "#meta" }
      }
    };
  }
});

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/refs/json-schema-2020-12/meta/content.json
var require_content = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/refs/json-schema-2020-12/meta/content.json"(exports2, module2) {
    module2.exports = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      $id: "https://json-schema.org/draft/2020-12/meta/content",
      $vocabulary: {
        "https://json-schema.org/draft/2020-12/vocab/content": true
      },
      $dynamicAnchor: "meta",
      title: "Content vocabulary meta-schema",
      type: ["object", "boolean"],
      properties: {
        contentEncoding: { type: "string" },
        contentMediaType: { type: "string" },
        contentSchema: { $dynamicRef: "#meta" }
      }
    };
  }
});

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/refs/json-schema-2020-12/meta/core.json
var require_core3 = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/refs/json-schema-2020-12/meta/core.json"(exports2, module2) {
    module2.exports = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      $id: "https://json-schema.org/draft/2020-12/meta/core",
      $vocabulary: {
        "https://json-schema.org/draft/2020-12/vocab/core": true
      },
      $dynamicAnchor: "meta",
      title: "Core vocabulary meta-schema",
      type: ["object", "boolean"],
      properties: {
        $id: {
          $ref: "#/$defs/uriReferenceString",
          $comment: "Non-empty fragments not allowed.",
          pattern: "^[^#]*#?$"
        },
        $schema: { $ref: "#/$defs/uriString" },
        $ref: { $ref: "#/$defs/uriReferenceString" },
        $anchor: { $ref: "#/$defs/anchorString" },
        $dynamicRef: { $ref: "#/$defs/uriReferenceString" },
        $dynamicAnchor: { $ref: "#/$defs/anchorString" },
        $vocabulary: {
          type: "object",
          propertyNames: { $ref: "#/$defs/uriString" },
          additionalProperties: {
            type: "boolean"
          }
        },
        $comment: {
          type: "string"
        },
        $defs: {
          type: "object",
          additionalProperties: { $dynamicRef: "#meta" }
        }
      },
      $defs: {
        anchorString: {
          type: "string",
          pattern: "^[A-Za-z_][-A-Za-z0-9._]*$"
        },
        uriString: {
          type: "string",
          format: "uri"
        },
        uriReferenceString: {
          type: "string",
          format: "uri-reference"
        }
      }
    };
  }
});

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/refs/json-schema-2020-12/meta/format-annotation.json
var require_format_annotation = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/refs/json-schema-2020-12/meta/format-annotation.json"(exports2, module2) {
    module2.exports = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      $id: "https://json-schema.org/draft/2020-12/meta/format-annotation",
      $vocabulary: {
        "https://json-schema.org/draft/2020-12/vocab/format-annotation": true
      },
      $dynamicAnchor: "meta",
      title: "Format vocabulary meta-schema for annotation results",
      type: ["object", "boolean"],
      properties: {
        format: { type: "string" }
      }
    };
  }
});

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/refs/json-schema-2020-12/meta/meta-data.json
var require_meta_data = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/refs/json-schema-2020-12/meta/meta-data.json"(exports2, module2) {
    module2.exports = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      $id: "https://json-schema.org/draft/2020-12/meta/meta-data",
      $vocabulary: {
        "https://json-schema.org/draft/2020-12/vocab/meta-data": true
      },
      $dynamicAnchor: "meta",
      title: "Meta-data vocabulary meta-schema",
      type: ["object", "boolean"],
      properties: {
        title: {
          type: "string"
        },
        description: {
          type: "string"
        },
        default: true,
        deprecated: {
          type: "boolean",
          default: false
        },
        readOnly: {
          type: "boolean",
          default: false
        },
        writeOnly: {
          type: "boolean",
          default: false
        },
        examples: {
          type: "array",
          items: true
        }
      }
    };
  }
});

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/refs/json-schema-2020-12/meta/validation.json
var require_validation2 = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/refs/json-schema-2020-12/meta/validation.json"(exports2, module2) {
    module2.exports = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      $id: "https://json-schema.org/draft/2020-12/meta/validation",
      $vocabulary: {
        "https://json-schema.org/draft/2020-12/vocab/validation": true
      },
      $dynamicAnchor: "meta",
      title: "Validation vocabulary meta-schema",
      type: ["object", "boolean"],
      properties: {
        type: {
          anyOf: [
            { $ref: "#/$defs/simpleTypes" },
            {
              type: "array",
              items: { $ref: "#/$defs/simpleTypes" },
              minItems: 1,
              uniqueItems: true
            }
          ]
        },
        const: true,
        enum: {
          type: "array",
          items: true
        },
        multipleOf: {
          type: "number",
          exclusiveMinimum: 0
        },
        maximum: {
          type: "number"
        },
        exclusiveMaximum: {
          type: "number"
        },
        minimum: {
          type: "number"
        },
        exclusiveMinimum: {
          type: "number"
        },
        maxLength: { $ref: "#/$defs/nonNegativeInteger" },
        minLength: { $ref: "#/$defs/nonNegativeIntegerDefault0" },
        pattern: {
          type: "string",
          format: "regex"
        },
        maxItems: { $ref: "#/$defs/nonNegativeInteger" },
        minItems: { $ref: "#/$defs/nonNegativeIntegerDefault0" },
        uniqueItems: {
          type: "boolean",
          default: false
        },
        maxContains: { $ref: "#/$defs/nonNegativeInteger" },
        minContains: {
          $ref: "#/$defs/nonNegativeInteger",
          default: 1
        },
        maxProperties: { $ref: "#/$defs/nonNegativeInteger" },
        minProperties: { $ref: "#/$defs/nonNegativeIntegerDefault0" },
        required: { $ref: "#/$defs/stringArray" },
        dependentRequired: {
          type: "object",
          additionalProperties: {
            $ref: "#/$defs/stringArray"
          }
        }
      },
      $defs: {
        nonNegativeInteger: {
          type: "integer",
          minimum: 0
        },
        nonNegativeIntegerDefault0: {
          $ref: "#/$defs/nonNegativeInteger",
          default: 0
        },
        simpleTypes: {
          enum: ["array", "boolean", "integer", "null", "number", "object", "string"]
        },
        stringArray: {
          type: "array",
          items: { type: "string" },
          uniqueItems: true,
          default: []
        }
      }
    };
  }
});

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/refs/json-schema-2020-12/index.js
var require_json_schema_2020_12 = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/refs/json-schema-2020-12/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var metaSchema = require_schema();
    var applicator = require_applicator2();
    var unevaluated = require_unevaluated2();
    var content = require_content();
    var core = require_core3();
    var format = require_format_annotation();
    var metadata = require_meta_data();
    var validation = require_validation2();
    var META_SUPPORT_DATA = ["/properties"];
    function addMetaSchema2020($data) {
      ;
      [
        metaSchema,
        applicator,
        unevaluated,
        content,
        core,
        with$data(this, format),
        metadata,
        with$data(this, validation)
      ].forEach((sch) => this.addMetaSchema(sch, void 0, false));
      return this;
      function with$data(ajv2, sch) {
        return $data ? ajv2.$dataMetaSchema(sch, META_SUPPORT_DATA) : sch;
      }
    }
    exports2.default = addMetaSchema2020;
  }
});

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/2020.js
var require__ = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/2020.js"(exports2, module2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.MissingRefError = exports2.ValidationError = exports2.CodeGen = exports2.Name = exports2.nil = exports2.stringify = exports2.str = exports2._ = exports2.KeywordCxt = exports2.Ajv2020 = void 0;
    var core_1 = require_core();
    var draft2020_1 = require_draft2020();
    var discriminator_1 = require_discriminator();
    var json_schema_2020_12_1 = require_json_schema_2020_12();
    var META_SCHEMA_ID = "https://json-schema.org/draft/2020-12/schema";
    var Ajv20202 = class extends core_1.default {
      constructor(opts = {}) {
        super({
          ...opts,
          dynamicRef: true,
          next: true,
          unevaluated: true
        });
      }
      _addVocabularies() {
        super._addVocabularies();
        draft2020_1.default.forEach((v) => this.addVocabulary(v));
        if (this.opts.discriminator)
          this.addKeyword(discriminator_1.default);
      }
      _addDefaultMetaSchema() {
        super._addDefaultMetaSchema();
        const { $data, meta } = this.opts;
        if (!meta)
          return;
        json_schema_2020_12_1.default.call(this, $data);
        this.refs["http://json-schema.org/schema"] = META_SCHEMA_ID;
      }
      defaultMeta() {
        return this.opts.defaultMeta = super.defaultMeta() || (this.getSchema(META_SCHEMA_ID) ? META_SCHEMA_ID : void 0);
      }
    };
    exports2.Ajv2020 = Ajv20202;
    module2.exports = exports2 = Ajv20202;
    module2.exports.Ajv2020 = Ajv20202;
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.default = Ajv20202;
    var validate_1 = require_validate();
    Object.defineProperty(exports2, "KeywordCxt", { enumerable: true, get: function() {
      return validate_1.KeywordCxt;
    } });
    var codegen_1 = require_codegen();
    Object.defineProperty(exports2, "_", { enumerable: true, get: function() {
      return codegen_1._;
    } });
    Object.defineProperty(exports2, "str", { enumerable: true, get: function() {
      return codegen_1.str;
    } });
    Object.defineProperty(exports2, "stringify", { enumerable: true, get: function() {
      return codegen_1.stringify;
    } });
    Object.defineProperty(exports2, "nil", { enumerable: true, get: function() {
      return codegen_1.nil;
    } });
    Object.defineProperty(exports2, "Name", { enumerable: true, get: function() {
      return codegen_1.Name;
    } });
    Object.defineProperty(exports2, "CodeGen", { enumerable: true, get: function() {
      return codegen_1.CodeGen;
    } });
    var validation_error_1 = require_validation_error();
    Object.defineProperty(exports2, "ValidationError", { enumerable: true, get: function() {
      return validation_error_1.default;
    } });
    var ref_error_1 = require_ref_error();
    Object.defineProperty(exports2, "MissingRefError", { enumerable: true, get: function() {
      return ref_error_1.default;
    } });
  }
});

// node_modules/.pnpm/ajv-formats@3.0.1_ajv@8.20.0/node_modules/ajv-formats/dist/formats.js
var require_formats = __commonJS({
  "node_modules/.pnpm/ajv-formats@3.0.1_ajv@8.20.0/node_modules/ajv-formats/dist/formats.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.formatNames = exports2.fastFormats = exports2.fullFormats = void 0;
    function fmtDef(validate, compare) {
      return { validate, compare };
    }
    exports2.fullFormats = {
      // date: http://tools.ietf.org/html/rfc3339#section-5.6
      date: fmtDef(date3, compareDate),
      // date-time: http://tools.ietf.org/html/rfc3339#section-5.6
      time: fmtDef(getTime(true), compareTime),
      "date-time": fmtDef(getDateTime(true), compareDateTime),
      "iso-time": fmtDef(getTime(), compareIsoTime),
      "iso-date-time": fmtDef(getDateTime(), compareIsoDateTime),
      // duration: https://tools.ietf.org/html/rfc3339#appendix-A
      duration: /^P(?!$)((\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+S)?)?|(\d+W)?)$/,
      uri,
      "uri-reference": /^(?:[a-z][a-z0-9+\-.]*:)?(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'"()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*)?(?:\?(?:[a-z0-9\-._~!$&'"()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'"()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i,
      // uri-template: https://tools.ietf.org/html/rfc6570
      "uri-template": /^(?:(?:[^\x00-\x20"'<>%\\^`{|}]|%[0-9a-f]{2})|\{[+#./;?&=,!@|]?(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?(?:,(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?)*\})*$/i,
      // For the source: https://gist.github.com/dperini/729294
      // For test cases: https://mathiasbynens.be/demo/url-regex
      url: /^(?:https?|ftp):\/\/(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z0-9\u{00a1}-\u{ffff}]+-)*[a-z0-9\u{00a1}-\u{ffff}]+)(?:\.(?:[a-z0-9\u{00a1}-\u{ffff}]+-)*[a-z0-9\u{00a1}-\u{ffff}]+)*(?:\.(?:[a-z\u{00a1}-\u{ffff}]{2,})))(?::\d{2,5})?(?:\/[^\s]*)?$/iu,
      email: /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i,
      hostname: /^(?=.{1,253}\.?$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[-0-9a-z]{0,61}[0-9a-z])?)*\.?$/i,
      // optimized https://www.safaribooksonline.com/library/view/regular-expressions-cookbook/9780596802837/ch07s16.html
      ipv4: /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/,
      ipv6: /^((([0-9a-f]{1,4}:){7}([0-9a-f]{1,4}|:))|(([0-9a-f]{1,4}:){6}(:[0-9a-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){5}(((:[0-9a-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){4}(((:[0-9a-f]{1,4}){1,3})|((:[0-9a-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){3}(((:[0-9a-f]{1,4}){1,4})|((:[0-9a-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){2}(((:[0-9a-f]{1,4}){1,5})|((:[0-9a-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){1}(((:[0-9a-f]{1,4}){1,6})|((:[0-9a-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9a-f]{1,4}){1,7})|((:[0-9a-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))$/i,
      regex,
      // uuid: http://tools.ietf.org/html/rfc4122
      uuid: /^(?:urn:uuid:)?[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i,
      // JSON-pointer: https://tools.ietf.org/html/rfc6901
      // uri fragment: https://tools.ietf.org/html/rfc3986#appendix-A
      "json-pointer": /^(?:\/(?:[^~/]|~0|~1)*)*$/,
      "json-pointer-uri-fragment": /^#(?:\/(?:[a-z0-9_\-.!$&'()*+,;:=@]|%[0-9a-f]{2}|~0|~1)*)*$/i,
      // relative JSON-pointer: http://tools.ietf.org/html/draft-luff-relative-json-pointer-00
      "relative-json-pointer": /^(?:0|[1-9][0-9]*)(?:#|(?:\/(?:[^~/]|~0|~1)*)*)$/,
      // the following formats are used by the openapi specification: https://spec.openapis.org/oas/v3.0.0#data-types
      // byte: https://github.com/miguelmota/is-base64
      byte,
      // signed 32 bit integer
      int32: { type: "number", validate: validateInt32 },
      // signed 64 bit integer
      int64: { type: "number", validate: validateInt64 },
      // C-type float
      float: { type: "number", validate: validateNumber },
      // C-type double
      double: { type: "number", validate: validateNumber },
      // hint to the UI to hide input strings
      password: true,
      // unchecked string payload
      binary: true
    };
    exports2.fastFormats = {
      ...exports2.fullFormats,
      date: fmtDef(/^\d\d\d\d-[0-1]\d-[0-3]\d$/, compareDate),
      time: fmtDef(/^(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)$/i, compareTime),
      "date-time": fmtDef(/^\d\d\d\d-[0-1]\d-[0-3]\dt(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)$/i, compareDateTime),
      "iso-time": fmtDef(/^(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)?$/i, compareIsoTime),
      "iso-date-time": fmtDef(/^\d\d\d\d-[0-1]\d-[0-3]\d[t\s](?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)?$/i, compareIsoDateTime),
      // uri: https://github.com/mafintosh/is-my-json-valid/blob/master/formats.js
      uri: /^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/)?[^\s]*$/i,
      "uri-reference": /^(?:(?:[a-z][a-z0-9+\-.]*:)?\/?\/)?(?:[^\\\s#][^\s#]*)?(?:#[^\\\s]*)?$/i,
      // email (sources from jsen validator):
      // http://stackoverflow.com/questions/201323/using-a-regular-expression-to-validate-an-email-address#answer-8829363
      // http://www.w3.org/TR/html5/forms.html#valid-e-mail-address (search for 'wilful violation')
      email: /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/i
    };
    exports2.formatNames = Object.keys(exports2.fullFormats);
    function isLeapYear(year) {
      return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    }
    var DATE = /^(\d\d\d\d)-(\d\d)-(\d\d)$/;
    var DAYS = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    function date3(str) {
      const matches = DATE.exec(str);
      if (!matches)
        return false;
      const year = +matches[1];
      const month = +matches[2];
      const day = +matches[3];
      return month >= 1 && month <= 12 && day >= 1 && day <= (month === 2 && isLeapYear(year) ? 29 : DAYS[month]);
    }
    function compareDate(d1, d2) {
      if (!(d1 && d2))
        return void 0;
      if (d1 > d2)
        return 1;
      if (d1 < d2)
        return -1;
      return 0;
    }
    var TIME = /^(\d\d):(\d\d):(\d\d(?:\.\d+)?)(z|([+-])(\d\d)(?::?(\d\d))?)?$/i;
    function getTime(strictTimeZone) {
      return function time2(str) {
        const matches = TIME.exec(str);
        if (!matches)
          return false;
        const hr = +matches[1];
        const min = +matches[2];
        const sec = +matches[3];
        const tz = matches[4];
        const tzSign = matches[5] === "-" ? -1 : 1;
        const tzH = +(matches[6] || 0);
        const tzM = +(matches[7] || 0);
        if (tzH > 23 || tzM > 59 || strictTimeZone && !tz)
          return false;
        if (hr <= 23 && min <= 59 && sec < 60)
          return true;
        const utcMin = min - tzM * tzSign;
        const utcHr = hr - tzH * tzSign - (utcMin < 0 ? 1 : 0);
        return (utcHr === 23 || utcHr === -1) && (utcMin === 59 || utcMin === -1) && sec < 61;
      };
    }
    function compareTime(s1, s2) {
      if (!(s1 && s2))
        return void 0;
      const t1 = (/* @__PURE__ */ new Date("2020-01-01T" + s1)).valueOf();
      const t2 = (/* @__PURE__ */ new Date("2020-01-01T" + s2)).valueOf();
      if (!(t1 && t2))
        return void 0;
      return t1 - t2;
    }
    function compareIsoTime(t1, t2) {
      if (!(t1 && t2))
        return void 0;
      const a1 = TIME.exec(t1);
      const a2 = TIME.exec(t2);
      if (!(a1 && a2))
        return void 0;
      t1 = a1[1] + a1[2] + a1[3];
      t2 = a2[1] + a2[2] + a2[3];
      if (t1 > t2)
        return 1;
      if (t1 < t2)
        return -1;
      return 0;
    }
    var DATE_TIME_SEPARATOR = /t|\s/i;
    function getDateTime(strictTimeZone) {
      const time2 = getTime(strictTimeZone);
      return function date_time(str) {
        const dateTime = str.split(DATE_TIME_SEPARATOR);
        return dateTime.length === 2 && date3(dateTime[0]) && time2(dateTime[1]);
      };
    }
    function compareDateTime(dt1, dt2) {
      if (!(dt1 && dt2))
        return void 0;
      const d1 = new Date(dt1).valueOf();
      const d2 = new Date(dt2).valueOf();
      if (!(d1 && d2))
        return void 0;
      return d1 - d2;
    }
    function compareIsoDateTime(dt1, dt2) {
      if (!(dt1 && dt2))
        return void 0;
      const [d1, t1] = dt1.split(DATE_TIME_SEPARATOR);
      const [d2, t2] = dt2.split(DATE_TIME_SEPARATOR);
      const res = compareDate(d1, d2);
      if (res === void 0)
        return void 0;
      return res || compareTime(t1, t2);
    }
    var NOT_URI_FRAGMENT = /\/|:/;
    var URI = /^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)(?:\?(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i;
    function uri(str) {
      return NOT_URI_FRAGMENT.test(str) && URI.test(str);
    }
    var BYTE = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/gm;
    function byte(str) {
      BYTE.lastIndex = 0;
      return BYTE.test(str);
    }
    var MIN_INT32 = -(2 ** 31);
    var MAX_INT32 = 2 ** 31 - 1;
    function validateInt32(value) {
      return Number.isInteger(value) && value <= MAX_INT32 && value >= MIN_INT32;
    }
    function validateInt64(value) {
      return Number.isInteger(value);
    }
    function validateNumber() {
      return true;
    }
    var Z_ANCHOR = /[^\\]\\Z/;
    function regex(str) {
      if (Z_ANCHOR.test(str))
        return false;
      try {
        new RegExp(str);
        return true;
      } catch (e) {
        return false;
      }
    }
  }
});

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/draft7.js
var require_draft7 = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/vocabularies/draft7.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var core_1 = require_core2();
    var validation_1 = require_validation();
    var applicator_1 = require_applicator();
    var format_1 = require_format2();
    var metadata_1 = require_metadata();
    var draft7Vocabularies = [
      core_1.default,
      validation_1.default,
      (0, applicator_1.default)(),
      format_1.default,
      metadata_1.metadataVocabulary,
      metadata_1.contentVocabulary
    ];
    exports2.default = draft7Vocabularies;
  }
});

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/refs/json-schema-draft-07.json
var require_json_schema_draft_07 = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/refs/json-schema-draft-07.json"(exports2, module2) {
    module2.exports = {
      $schema: "http://json-schema.org/draft-07/schema#",
      $id: "http://json-schema.org/draft-07/schema#",
      title: "Core schema meta-schema",
      definitions: {
        schemaArray: {
          type: "array",
          minItems: 1,
          items: { $ref: "#" }
        },
        nonNegativeInteger: {
          type: "integer",
          minimum: 0
        },
        nonNegativeIntegerDefault0: {
          allOf: [{ $ref: "#/definitions/nonNegativeInteger" }, { default: 0 }]
        },
        simpleTypes: {
          enum: ["array", "boolean", "integer", "null", "number", "object", "string"]
        },
        stringArray: {
          type: "array",
          items: { type: "string" },
          uniqueItems: true,
          default: []
        }
      },
      type: ["object", "boolean"],
      properties: {
        $id: {
          type: "string",
          format: "uri-reference"
        },
        $schema: {
          type: "string",
          format: "uri"
        },
        $ref: {
          type: "string",
          format: "uri-reference"
        },
        $comment: {
          type: "string"
        },
        title: {
          type: "string"
        },
        description: {
          type: "string"
        },
        default: true,
        readOnly: {
          type: "boolean",
          default: false
        },
        examples: {
          type: "array",
          items: true
        },
        multipleOf: {
          type: "number",
          exclusiveMinimum: 0
        },
        maximum: {
          type: "number"
        },
        exclusiveMaximum: {
          type: "number"
        },
        minimum: {
          type: "number"
        },
        exclusiveMinimum: {
          type: "number"
        },
        maxLength: { $ref: "#/definitions/nonNegativeInteger" },
        minLength: { $ref: "#/definitions/nonNegativeIntegerDefault0" },
        pattern: {
          type: "string",
          format: "regex"
        },
        additionalItems: { $ref: "#" },
        items: {
          anyOf: [{ $ref: "#" }, { $ref: "#/definitions/schemaArray" }],
          default: true
        },
        maxItems: { $ref: "#/definitions/nonNegativeInteger" },
        minItems: { $ref: "#/definitions/nonNegativeIntegerDefault0" },
        uniqueItems: {
          type: "boolean",
          default: false
        },
        contains: { $ref: "#" },
        maxProperties: { $ref: "#/definitions/nonNegativeInteger" },
        minProperties: { $ref: "#/definitions/nonNegativeIntegerDefault0" },
        required: { $ref: "#/definitions/stringArray" },
        additionalProperties: { $ref: "#" },
        definitions: {
          type: "object",
          additionalProperties: { $ref: "#" },
          default: {}
        },
        properties: {
          type: "object",
          additionalProperties: { $ref: "#" },
          default: {}
        },
        patternProperties: {
          type: "object",
          additionalProperties: { $ref: "#" },
          propertyNames: { format: "regex" },
          default: {}
        },
        dependencies: {
          type: "object",
          additionalProperties: {
            anyOf: [{ $ref: "#" }, { $ref: "#/definitions/stringArray" }]
          }
        },
        propertyNames: { $ref: "#" },
        const: true,
        enum: {
          type: "array",
          items: true,
          minItems: 1,
          uniqueItems: true
        },
        type: {
          anyOf: [
            { $ref: "#/definitions/simpleTypes" },
            {
              type: "array",
              items: { $ref: "#/definitions/simpleTypes" },
              minItems: 1,
              uniqueItems: true
            }
          ]
        },
        format: { type: "string" },
        contentMediaType: { type: "string" },
        contentEncoding: { type: "string" },
        if: { $ref: "#" },
        then: { $ref: "#" },
        else: { $ref: "#" },
        allOf: { $ref: "#/definitions/schemaArray" },
        anyOf: { $ref: "#/definitions/schemaArray" },
        oneOf: { $ref: "#/definitions/schemaArray" },
        not: { $ref: "#" }
      },
      default: true
    };
  }
});

// node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/ajv.js
var require_ajv = __commonJS({
  "node_modules/.pnpm/ajv@8.20.0/node_modules/ajv/dist/ajv.js"(exports2, module2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.MissingRefError = exports2.ValidationError = exports2.CodeGen = exports2.Name = exports2.nil = exports2.stringify = exports2.str = exports2._ = exports2.KeywordCxt = exports2.Ajv = void 0;
    var core_1 = require_core();
    var draft7_1 = require_draft7();
    var discriminator_1 = require_discriminator();
    var draft7MetaSchema = require_json_schema_draft_07();
    var META_SUPPORT_DATA = ["/properties"];
    var META_SCHEMA_ID = "http://json-schema.org/draft-07/schema";
    var Ajv = class extends core_1.default {
      _addVocabularies() {
        super._addVocabularies();
        draft7_1.default.forEach((v) => this.addVocabulary(v));
        if (this.opts.discriminator)
          this.addKeyword(discriminator_1.default);
      }
      _addDefaultMetaSchema() {
        super._addDefaultMetaSchema();
        if (!this.opts.meta)
          return;
        const metaSchema = this.opts.$data ? this.$dataMetaSchema(draft7MetaSchema, META_SUPPORT_DATA) : draft7MetaSchema;
        this.addMetaSchema(metaSchema, META_SCHEMA_ID, false);
        this.refs["http://json-schema.org/schema"] = META_SCHEMA_ID;
      }
      defaultMeta() {
        return this.opts.defaultMeta = super.defaultMeta() || (this.getSchema(META_SCHEMA_ID) ? META_SCHEMA_ID : void 0);
      }
    };
    exports2.Ajv = Ajv;
    module2.exports = exports2 = Ajv;
    module2.exports.Ajv = Ajv;
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.default = Ajv;
    var validate_1 = require_validate();
    Object.defineProperty(exports2, "KeywordCxt", { enumerable: true, get: function() {
      return validate_1.KeywordCxt;
    } });
    var codegen_1 = require_codegen();
    Object.defineProperty(exports2, "_", { enumerable: true, get: function() {
      return codegen_1._;
    } });
    Object.defineProperty(exports2, "str", { enumerable: true, get: function() {
      return codegen_1.str;
    } });
    Object.defineProperty(exports2, "stringify", { enumerable: true, get: function() {
      return codegen_1.stringify;
    } });
    Object.defineProperty(exports2, "nil", { enumerable: true, get: function() {
      return codegen_1.nil;
    } });
    Object.defineProperty(exports2, "Name", { enumerable: true, get: function() {
      return codegen_1.Name;
    } });
    Object.defineProperty(exports2, "CodeGen", { enumerable: true, get: function() {
      return codegen_1.CodeGen;
    } });
    var validation_error_1 = require_validation_error();
    Object.defineProperty(exports2, "ValidationError", { enumerable: true, get: function() {
      return validation_error_1.default;
    } });
    var ref_error_1 = require_ref_error();
    Object.defineProperty(exports2, "MissingRefError", { enumerable: true, get: function() {
      return ref_error_1.default;
    } });
  }
});

// node_modules/.pnpm/ajv-formats@3.0.1_ajv@8.20.0/node_modules/ajv-formats/dist/limit.js
var require_limit = __commonJS({
  "node_modules/.pnpm/ajv-formats@3.0.1_ajv@8.20.0/node_modules/ajv-formats/dist/limit.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.formatLimitDefinition = void 0;
    var ajv_1 = require_ajv();
    var codegen_1 = require_codegen();
    var ops = codegen_1.operators;
    var KWDs = {
      formatMaximum: { okStr: "<=", ok: ops.LTE, fail: ops.GT },
      formatMinimum: { okStr: ">=", ok: ops.GTE, fail: ops.LT },
      formatExclusiveMaximum: { okStr: "<", ok: ops.LT, fail: ops.GTE },
      formatExclusiveMinimum: { okStr: ">", ok: ops.GT, fail: ops.LTE }
    };
    var error = {
      message: ({ keyword, schemaCode }) => (0, codegen_1.str)`should be ${KWDs[keyword].okStr} ${schemaCode}`,
      params: ({ keyword, schemaCode }) => (0, codegen_1._)`{comparison: ${KWDs[keyword].okStr}, limit: ${schemaCode}}`
    };
    exports2.formatLimitDefinition = {
      keyword: Object.keys(KWDs),
      type: "string",
      schemaType: "string",
      $data: true,
      error,
      code(cxt) {
        const { gen, data, schemaCode, keyword, it } = cxt;
        const { opts, self } = it;
        if (!opts.validateFormats)
          return;
        const fCxt = new ajv_1.KeywordCxt(it, self.RULES.all.format.definition, "format");
        if (fCxt.$data)
          validate$DataFormat();
        else
          validateFormat();
        function validate$DataFormat() {
          const fmts = gen.scopeValue("formats", {
            ref: self.formats,
            code: opts.code.formats
          });
          const fmt = gen.const("fmt", (0, codegen_1._)`${fmts}[${fCxt.schemaCode}]`);
          cxt.fail$data((0, codegen_1.or)((0, codegen_1._)`typeof ${fmt} != "object"`, (0, codegen_1._)`${fmt} instanceof RegExp`, (0, codegen_1._)`typeof ${fmt}.compare != "function"`, compareCode(fmt)));
        }
        function validateFormat() {
          const format = fCxt.schema;
          const fmtDef = self.formats[format];
          if (!fmtDef || fmtDef === true)
            return;
          if (typeof fmtDef != "object" || fmtDef instanceof RegExp || typeof fmtDef.compare != "function") {
            throw new Error(`"${keyword}": format "${format}" does not define "compare" function`);
          }
          const fmt = gen.scopeValue("formats", {
            key: format,
            ref: fmtDef,
            code: opts.code.formats ? (0, codegen_1._)`${opts.code.formats}${(0, codegen_1.getProperty)(format)}` : void 0
          });
          cxt.fail$data(compareCode(fmt));
        }
        function compareCode(fmt) {
          return (0, codegen_1._)`${fmt}.compare(${data}, ${schemaCode}) ${KWDs[keyword].fail} 0`;
        }
      },
      dependencies: ["format"]
    };
    var formatLimitPlugin = (ajv2) => {
      ajv2.addKeyword(exports2.formatLimitDefinition);
      return ajv2;
    };
    exports2.default = formatLimitPlugin;
  }
});

// node_modules/.pnpm/ajv-formats@3.0.1_ajv@8.20.0/node_modules/ajv-formats/dist/index.js
var require_dist = __commonJS({
  "node_modules/.pnpm/ajv-formats@3.0.1_ajv@8.20.0/node_modules/ajv-formats/dist/index.js"(exports2, module2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var formats_1 = require_formats();
    var limit_1 = require_limit();
    var codegen_1 = require_codegen();
    var fullName = new codegen_1.Name("fullFormats");
    var fastName = new codegen_1.Name("fastFormats");
    var formatsPlugin = (ajv2, opts = { keywords: true }) => {
      if (Array.isArray(opts)) {
        addFormats2(ajv2, opts, formats_1.fullFormats, fullName);
        return ajv2;
      }
      const [formats, exportName] = opts.mode === "fast" ? [formats_1.fastFormats, fastName] : [formats_1.fullFormats, fullName];
      const list = opts.formats || formats_1.formatNames;
      addFormats2(ajv2, list, formats, exportName);
      if (opts.keywords)
        (0, limit_1.default)(ajv2);
      return ajv2;
    };
    formatsPlugin.get = (name, mode = "full") => {
      const formats = mode === "fast" ? formats_1.fastFormats : formats_1.fullFormats;
      const f = formats[name];
      if (!f)
        throw new Error(`Unknown format "${name}"`);
      return f;
    };
    function addFormats2(ajv2, list, fs, exportName) {
      var _a;
      var _b;
      (_a = (_b = ajv2.opts.code).formats) !== null && _a !== void 0 ? _a : _b.formats = (0, codegen_1._)`require("ajv-formats/dist/formats").${exportName}`;
      for (const f of list)
        ajv2.addFormat(f, fs[f]);
    }
    module2.exports = exports2 = formatsPlugin;
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.default = formatsPlugin;
  }
});

// node_modules/.pnpm/postgres-array@2.0.0/node_modules/postgres-array/index.js
var require_postgres_array = __commonJS({
  "node_modules/.pnpm/postgres-array@2.0.0/node_modules/postgres-array/index.js"(exports2) {
    "use strict";
    exports2.parse = function(source, transform) {
      return new ArrayParser(source, transform).parse();
    };
    var ArrayParser = class _ArrayParser {
      constructor(source, transform) {
        this.source = source;
        this.transform = transform || identity;
        this.position = 0;
        this.entries = [];
        this.recorded = [];
        this.dimension = 0;
      }
      isEof() {
        return this.position >= this.source.length;
      }
      nextCharacter() {
        var character = this.source[this.position++];
        if (character === "\\") {
          return {
            value: this.source[this.position++],
            escaped: true
          };
        }
        return {
          value: character,
          escaped: false
        };
      }
      record(character) {
        this.recorded.push(character);
      }
      newEntry(includeEmpty) {
        var entry;
        if (this.recorded.length > 0 || includeEmpty) {
          entry = this.recorded.join("");
          if (entry === "NULL" && !includeEmpty) {
            entry = null;
          }
          if (entry !== null) entry = this.transform(entry);
          this.entries.push(entry);
          this.recorded = [];
        }
      }
      consumeDimensions() {
        if (this.source[0] === "[") {
          while (!this.isEof()) {
            var char = this.nextCharacter();
            if (char.value === "=") break;
          }
        }
      }
      parse(nested) {
        var character, parser, quote;
        this.consumeDimensions();
        while (!this.isEof()) {
          character = this.nextCharacter();
          if (character.value === "{" && !quote) {
            this.dimension++;
            if (this.dimension > 1) {
              parser = new _ArrayParser(this.source.substr(this.position - 1), this.transform);
              this.entries.push(parser.parse(true));
              this.position += parser.position - 2;
            }
          } else if (character.value === "}" && !quote) {
            this.dimension--;
            if (!this.dimension) {
              this.newEntry();
              if (nested) return this.entries;
            }
          } else if (character.value === '"' && !character.escaped) {
            if (quote) this.newEntry(true);
            quote = !quote;
          } else if (character.value === "," && !quote) {
            this.newEntry();
          } else {
            this.record(character.value);
          }
        }
        if (this.dimension !== 0) {
          throw new Error("array dimension not balanced");
        }
        return this.entries;
      }
    };
    function identity(value) {
      return value;
    }
  }
});

// node_modules/.pnpm/pg-types@2.2.0/node_modules/pg-types/lib/arrayParser.js
var require_arrayParser = __commonJS({
  "node_modules/.pnpm/pg-types@2.2.0/node_modules/pg-types/lib/arrayParser.js"(exports2, module2) {
    var array = require_postgres_array();
    module2.exports = {
      create: function(source, transform) {
        return {
          parse: function() {
            return array.parse(source, transform);
          }
        };
      }
    };
  }
});

// node_modules/.pnpm/postgres-date@1.0.7/node_modules/postgres-date/index.js
var require_postgres_date = __commonJS({
  "node_modules/.pnpm/postgres-date@1.0.7/node_modules/postgres-date/index.js"(exports2, module2) {
    "use strict";
    var DATE_TIME = /(\d{1,})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})(\.\d{1,})?.*?( BC)?$/;
    var DATE = /^(\d{1,})-(\d{2})-(\d{2})( BC)?$/;
    var TIME_ZONE = /([Z+-])(\d{2})?:?(\d{2})?:?(\d{2})?/;
    var INFINITY = /^-?infinity$/;
    module2.exports = function parseDate(isoDate) {
      if (INFINITY.test(isoDate)) {
        return Number(isoDate.replace("i", "I"));
      }
      var matches = DATE_TIME.exec(isoDate);
      if (!matches) {
        return getDate(isoDate) || null;
      }
      var isBC = !!matches[8];
      var year = parseInt(matches[1], 10);
      if (isBC) {
        year = bcYearToNegativeYear(year);
      }
      var month = parseInt(matches[2], 10) - 1;
      var day = matches[3];
      var hour = parseInt(matches[4], 10);
      var minute = parseInt(matches[5], 10);
      var second = parseInt(matches[6], 10);
      var ms = matches[7];
      ms = ms ? 1e3 * parseFloat(ms) : 0;
      var date3;
      var offset = timeZoneOffset(isoDate);
      if (offset != null) {
        date3 = new Date(Date.UTC(year, month, day, hour, minute, second, ms));
        if (is0To99(year)) {
          date3.setUTCFullYear(year);
        }
        if (offset !== 0) {
          date3.setTime(date3.getTime() - offset);
        }
      } else {
        date3 = new Date(year, month, day, hour, minute, second, ms);
        if (is0To99(year)) {
          date3.setFullYear(year);
        }
      }
      return date3;
    };
    function getDate(isoDate) {
      var matches = DATE.exec(isoDate);
      if (!matches) {
        return;
      }
      var year = parseInt(matches[1], 10);
      var isBC = !!matches[4];
      if (isBC) {
        year = bcYearToNegativeYear(year);
      }
      var month = parseInt(matches[2], 10) - 1;
      var day = matches[3];
      var date3 = new Date(year, month, day);
      if (is0To99(year)) {
        date3.setFullYear(year);
      }
      return date3;
    }
    function timeZoneOffset(isoDate) {
      if (isoDate.endsWith("+00")) {
        return 0;
      }
      var zone = TIME_ZONE.exec(isoDate.split(" ")[1]);
      if (!zone) return;
      var type = zone[1];
      if (type === "Z") {
        return 0;
      }
      var sign = type === "-" ? -1 : 1;
      var offset = parseInt(zone[2], 10) * 3600 + parseInt(zone[3] || 0, 10) * 60 + parseInt(zone[4] || 0, 10);
      return offset * sign * 1e3;
    }
    function bcYearToNegativeYear(year) {
      return -(year - 1);
    }
    function is0To99(num) {
      return num >= 0 && num < 100;
    }
  }
});

// node_modules/.pnpm/xtend@4.0.2/node_modules/xtend/mutable.js
var require_mutable = __commonJS({
  "node_modules/.pnpm/xtend@4.0.2/node_modules/xtend/mutable.js"(exports2, module2) {
    module2.exports = extend;
    var hasOwnProperty = Object.prototype.hasOwnProperty;
    function extend(target) {
      for (var i = 1; i < arguments.length; i++) {
        var source = arguments[i];
        for (var key in source) {
          if (hasOwnProperty.call(source, key)) {
            target[key] = source[key];
          }
        }
      }
      return target;
    }
  }
});

// node_modules/.pnpm/postgres-interval@1.2.0/node_modules/postgres-interval/index.js
var require_postgres_interval = __commonJS({
  "node_modules/.pnpm/postgres-interval@1.2.0/node_modules/postgres-interval/index.js"(exports2, module2) {
    "use strict";
    var extend = require_mutable();
    module2.exports = PostgresInterval;
    function PostgresInterval(raw) {
      if (!(this instanceof PostgresInterval)) {
        return new PostgresInterval(raw);
      }
      extend(this, parse(raw));
    }
    var properties = ["seconds", "minutes", "hours", "days", "months", "years"];
    PostgresInterval.prototype.toPostgres = function() {
      var filtered = properties.filter(this.hasOwnProperty, this);
      if (this.milliseconds && filtered.indexOf("seconds") < 0) {
        filtered.push("seconds");
      }
      if (filtered.length === 0) return "0";
      return filtered.map(function(property) {
        var value = this[property] || 0;
        if (property === "seconds" && this.milliseconds) {
          value = (value + this.milliseconds / 1e3).toFixed(6).replace(/\.?0+$/, "");
        }
        return value + " " + property;
      }, this).join(" ");
    };
    var propertiesISOEquivalent = {
      years: "Y",
      months: "M",
      days: "D",
      hours: "H",
      minutes: "M",
      seconds: "S"
    };
    var dateProperties = ["years", "months", "days"];
    var timeProperties = ["hours", "minutes", "seconds"];
    PostgresInterval.prototype.toISOString = PostgresInterval.prototype.toISO = function() {
      var datePart = dateProperties.map(buildProperty, this).join("");
      var timePart = timeProperties.map(buildProperty, this).join("");
      return "P" + datePart + "T" + timePart;
      function buildProperty(property) {
        var value = this[property] || 0;
        if (property === "seconds" && this.milliseconds) {
          value = (value + this.milliseconds / 1e3).toFixed(6).replace(/0+$/, "");
        }
        return value + propertiesISOEquivalent[property];
      }
    };
    var NUMBER = "([+-]?\\d+)";
    var YEAR = NUMBER + "\\s+years?";
    var MONTH = NUMBER + "\\s+mons?";
    var DAY = NUMBER + "\\s+days?";
    var TIME = "([+-])?([\\d]*):(\\d\\d):(\\d\\d)\\.?(\\d{1,6})?";
    var INTERVAL = new RegExp([YEAR, MONTH, DAY, TIME].map(function(regexString) {
      return "(" + regexString + ")?";
    }).join("\\s*"));
    var positions = {
      years: 2,
      months: 4,
      days: 6,
      hours: 9,
      minutes: 10,
      seconds: 11,
      milliseconds: 12
    };
    var negatives = ["hours", "minutes", "seconds", "milliseconds"];
    function parseMilliseconds(fraction) {
      var microseconds = fraction + "000000".slice(fraction.length);
      return parseInt(microseconds, 10) / 1e3;
    }
    function parse(interval) {
      if (!interval) return {};
      var matches = INTERVAL.exec(interval);
      var isNegative = matches[8] === "-";
      return Object.keys(positions).reduce(function(parsed, property) {
        var position = positions[property];
        var value = matches[position];
        if (!value) return parsed;
        value = property === "milliseconds" ? parseMilliseconds(value) : parseInt(value, 10);
        if (!value) return parsed;
        if (isNegative && ~negatives.indexOf(property)) {
          value *= -1;
        }
        parsed[property] = value;
        return parsed;
      }, {});
    }
  }
});

// node_modules/.pnpm/postgres-bytea@1.0.1/node_modules/postgres-bytea/index.js
var require_postgres_bytea = __commonJS({
  "node_modules/.pnpm/postgres-bytea@1.0.1/node_modules/postgres-bytea/index.js"(exports2, module2) {
    "use strict";
    var bufferFrom = Buffer.from || Buffer;
    module2.exports = function parseBytea(input) {
      if (/^\\x/.test(input)) {
        return bufferFrom(input.substr(2), "hex");
      }
      var output = "";
      var i = 0;
      while (i < input.length) {
        if (input[i] !== "\\") {
          output += input[i];
          ++i;
        } else {
          if (/[0-7]{3}/.test(input.substr(i + 1, 3))) {
            output += String.fromCharCode(parseInt(input.substr(i + 1, 3), 8));
            i += 4;
          } else {
            var backslashes = 1;
            while (i + backslashes < input.length && input[i + backslashes] === "\\") {
              backslashes++;
            }
            for (var k = 0; k < Math.floor(backslashes / 2); ++k) {
              output += "\\";
            }
            i += Math.floor(backslashes / 2) * 2;
          }
        }
      }
      return bufferFrom(output, "binary");
    };
  }
});

// node_modules/.pnpm/pg-types@2.2.0/node_modules/pg-types/lib/textParsers.js
var require_textParsers = __commonJS({
  "node_modules/.pnpm/pg-types@2.2.0/node_modules/pg-types/lib/textParsers.js"(exports2, module2) {
    var array = require_postgres_array();
    var arrayParser = require_arrayParser();
    var parseDate = require_postgres_date();
    var parseInterval = require_postgres_interval();
    var parseByteA = require_postgres_bytea();
    function allowNull(fn) {
      return function nullAllowed(value) {
        if (value === null) return value;
        return fn(value);
      };
    }
    function parseBool(value) {
      if (value === null) return value;
      return value === "TRUE" || value === "t" || value === "true" || value === "y" || value === "yes" || value === "on" || value === "1";
    }
    function parseBoolArray(value) {
      if (!value) return null;
      return array.parse(value, parseBool);
    }
    function parseBaseTenInt(string) {
      return parseInt(string, 10);
    }
    function parseIntegerArray(value) {
      if (!value) return null;
      return array.parse(value, allowNull(parseBaseTenInt));
    }
    function parseBigIntegerArray(value) {
      if (!value) return null;
      return array.parse(value, allowNull(function(entry) {
        return parseBigInteger(entry).trim();
      }));
    }
    var parsePointArray = function(value) {
      if (!value) {
        return null;
      }
      var p = arrayParser.create(value, function(entry) {
        if (entry !== null) {
          entry = parsePoint(entry);
        }
        return entry;
      });
      return p.parse();
    };
    var parseFloatArray = function(value) {
      if (!value) {
        return null;
      }
      var p = arrayParser.create(value, function(entry) {
        if (entry !== null) {
          entry = parseFloat(entry);
        }
        return entry;
      });
      return p.parse();
    };
    var parseStringArray = function(value) {
      if (!value) {
        return null;
      }
      var p = arrayParser.create(value);
      return p.parse();
    };
    var parseDateArray = function(value) {
      if (!value) {
        return null;
      }
      var p = arrayParser.create(value, function(entry) {
        if (entry !== null) {
          entry = parseDate(entry);
        }
        return entry;
      });
      return p.parse();
    };
    var parseIntervalArray = function(value) {
      if (!value) {
        return null;
      }
      var p = arrayParser.create(value, function(entry) {
        if (entry !== null) {
          entry = parseInterval(entry);
        }
        return entry;
      });
      return p.parse();
    };
    var parseByteAArray = function(value) {
      if (!value) {
        return null;
      }
      return array.parse(value, allowNull(parseByteA));
    };
    var parseInteger = function(value) {
      return parseInt(value, 10);
    };
    var parseBigInteger = function(value) {
      var valStr = String(value);
      if (/^\d+$/.test(valStr)) {
        return valStr;
      }
      return value;
    };
    var parseJsonArray = function(value) {
      if (!value) {
        return null;
      }
      return array.parse(value, allowNull(JSON.parse));
    };
    var parsePoint = function(value) {
      if (value[0] !== "(") {
        return null;
      }
      value = value.substring(1, value.length - 1).split(",");
      return {
        x: parseFloat(value[0]),
        y: parseFloat(value[1])
      };
    };
    var parseCircle = function(value) {
      if (value[0] !== "<" && value[1] !== "(") {
        return null;
      }
      var point = "(";
      var radius = "";
      var pointParsed = false;
      for (var i = 2; i < value.length - 1; i++) {
        if (!pointParsed) {
          point += value[i];
        }
        if (value[i] === ")") {
          pointParsed = true;
          continue;
        } else if (!pointParsed) {
          continue;
        }
        if (value[i] === ",") {
          continue;
        }
        radius += value[i];
      }
      var result = parsePoint(point);
      result.radius = parseFloat(radius);
      return result;
    };
    var init = function(register) {
      register(20, parseBigInteger);
      register(21, parseInteger);
      register(23, parseInteger);
      register(26, parseInteger);
      register(700, parseFloat);
      register(701, parseFloat);
      register(16, parseBool);
      register(1082, parseDate);
      register(1114, parseDate);
      register(1184, parseDate);
      register(600, parsePoint);
      register(651, parseStringArray);
      register(718, parseCircle);
      register(1e3, parseBoolArray);
      register(1001, parseByteAArray);
      register(1005, parseIntegerArray);
      register(1007, parseIntegerArray);
      register(1028, parseIntegerArray);
      register(1016, parseBigIntegerArray);
      register(1017, parsePointArray);
      register(1021, parseFloatArray);
      register(1022, parseFloatArray);
      register(1231, parseFloatArray);
      register(1014, parseStringArray);
      register(1015, parseStringArray);
      register(1008, parseStringArray);
      register(1009, parseStringArray);
      register(1040, parseStringArray);
      register(1041, parseStringArray);
      register(1115, parseDateArray);
      register(1182, parseDateArray);
      register(1185, parseDateArray);
      register(1186, parseInterval);
      register(1187, parseIntervalArray);
      register(17, parseByteA);
      register(114, JSON.parse.bind(JSON));
      register(3802, JSON.parse.bind(JSON));
      register(199, parseJsonArray);
      register(3807, parseJsonArray);
      register(3907, parseStringArray);
      register(2951, parseStringArray);
      register(791, parseStringArray);
      register(1183, parseStringArray);
      register(1270, parseStringArray);
    };
    module2.exports = {
      init
    };
  }
});

// node_modules/.pnpm/pg-int8@1.0.1/node_modules/pg-int8/index.js
var require_pg_int8 = __commonJS({
  "node_modules/.pnpm/pg-int8@1.0.1/node_modules/pg-int8/index.js"(exports2, module2) {
    "use strict";
    var BASE = 1e6;
    function readInt8(buffer) {
      var high = buffer.readInt32BE(0);
      var low = buffer.readUInt32BE(4);
      var sign = "";
      if (high < 0) {
        high = ~high + (low === 0);
        low = ~low + 1 >>> 0;
        sign = "-";
      }
      var result = "";
      var carry;
      var t;
      var digits;
      var pad;
      var l;
      var i;
      {
        carry = high % BASE;
        high = high / BASE >>> 0;
        t = 4294967296 * carry + low;
        low = t / BASE >>> 0;
        digits = "" + (t - BASE * low);
        if (low === 0 && high === 0) {
          return sign + digits + result;
        }
        pad = "";
        l = 6 - digits.length;
        for (i = 0; i < l; i++) {
          pad += "0";
        }
        result = pad + digits + result;
      }
      {
        carry = high % BASE;
        high = high / BASE >>> 0;
        t = 4294967296 * carry + low;
        low = t / BASE >>> 0;
        digits = "" + (t - BASE * low);
        if (low === 0 && high === 0) {
          return sign + digits + result;
        }
        pad = "";
        l = 6 - digits.length;
        for (i = 0; i < l; i++) {
          pad += "0";
        }
        result = pad + digits + result;
      }
      {
        carry = high % BASE;
        high = high / BASE >>> 0;
        t = 4294967296 * carry + low;
        low = t / BASE >>> 0;
        digits = "" + (t - BASE * low);
        if (low === 0 && high === 0) {
          return sign + digits + result;
        }
        pad = "";
        l = 6 - digits.length;
        for (i = 0; i < l; i++) {
          pad += "0";
        }
        result = pad + digits + result;
      }
      {
        carry = high % BASE;
        t = 4294967296 * carry + low;
        digits = "" + t % BASE;
        return sign + digits + result;
      }
    }
    module2.exports = readInt8;
  }
});

// node_modules/.pnpm/pg-types@2.2.0/node_modules/pg-types/lib/binaryParsers.js
var require_binaryParsers = __commonJS({
  "node_modules/.pnpm/pg-types@2.2.0/node_modules/pg-types/lib/binaryParsers.js"(exports2, module2) {
    var parseInt64 = require_pg_int8();
    var parseBits = function(data, bits, offset, invert, callback) {
      offset = offset || 0;
      invert = invert || false;
      callback = callback || function(lastValue, newValue, bits2) {
        return lastValue * Math.pow(2, bits2) + newValue;
      };
      var offsetBytes = offset >> 3;
      var inv = function(value) {
        if (invert) {
          return ~value & 255;
        }
        return value;
      };
      var mask = 255;
      var firstBits = 8 - offset % 8;
      if (bits < firstBits) {
        mask = 255 << 8 - bits & 255;
        firstBits = bits;
      }
      if (offset) {
        mask = mask >> offset % 8;
      }
      var result = 0;
      if (offset % 8 + bits >= 8) {
        result = callback(0, inv(data[offsetBytes]) & mask, firstBits);
      }
      var bytes = bits + offset >> 3;
      for (var i = offsetBytes + 1; i < bytes; i++) {
        result = callback(result, inv(data[i]), 8);
      }
      var lastBits = (bits + offset) % 8;
      if (lastBits > 0) {
        result = callback(result, inv(data[bytes]) >> 8 - lastBits, lastBits);
      }
      return result;
    };
    var parseFloatFromBits = function(data, precisionBits, exponentBits) {
      var bias = Math.pow(2, exponentBits - 1) - 1;
      var sign = parseBits(data, 1);
      var exponent = parseBits(data, exponentBits, 1);
      if (exponent === 0) {
        return 0;
      }
      var precisionBitsCounter = 1;
      var parsePrecisionBits = function(lastValue, newValue, bits) {
        if (lastValue === 0) {
          lastValue = 1;
        }
        for (var i = 1; i <= bits; i++) {
          precisionBitsCounter /= 2;
          if ((newValue & 1 << bits - i) > 0) {
            lastValue += precisionBitsCounter;
          }
        }
        return lastValue;
      };
      var mantissa = parseBits(data, precisionBits, exponentBits + 1, false, parsePrecisionBits);
      if (exponent == Math.pow(2, exponentBits + 1) - 1) {
        if (mantissa === 0) {
          return sign === 0 ? Infinity : -Infinity;
        }
        return NaN;
      }
      return (sign === 0 ? 1 : -1) * Math.pow(2, exponent - bias) * mantissa;
    };
    var parseInt16 = function(value) {
      if (parseBits(value, 1) == 1) {
        return -1 * (parseBits(value, 15, 1, true) + 1);
      }
      return parseBits(value, 15, 1);
    };
    var parseInt32 = function(value) {
      if (parseBits(value, 1) == 1) {
        return -1 * (parseBits(value, 31, 1, true) + 1);
      }
      return parseBits(value, 31, 1);
    };
    var parseFloat32 = function(value) {
      return parseFloatFromBits(value, 23, 8);
    };
    var parseFloat64 = function(value) {
      return parseFloatFromBits(value, 52, 11);
    };
    var parseNumeric = function(value) {
      var sign = parseBits(value, 16, 32);
      if (sign == 49152) {
        return NaN;
      }
      var weight = Math.pow(1e4, parseBits(value, 16, 16));
      var result = 0;
      var digits = [];
      var ndigits = parseBits(value, 16);
      for (var i = 0; i < ndigits; i++) {
        result += parseBits(value, 16, 64 + 16 * i) * weight;
        weight /= 1e4;
      }
      var scale = Math.pow(10, parseBits(value, 16, 48));
      return (sign === 0 ? 1 : -1) * Math.round(result * scale) / scale;
    };
    var parseDate = function(isUTC, value) {
      var sign = parseBits(value, 1);
      var rawValue = parseBits(value, 63, 1);
      var result = new Date((sign === 0 ? 1 : -1) * rawValue / 1e3 + 9466848e5);
      if (!isUTC) {
        result.setTime(result.getTime() + result.getTimezoneOffset() * 6e4);
      }
      result.usec = rawValue % 1e3;
      result.getMicroSeconds = function() {
        return this.usec;
      };
      result.setMicroSeconds = function(value2) {
        this.usec = value2;
      };
      result.getUTCMicroSeconds = function() {
        return this.usec;
      };
      return result;
    };
    var parseArray = function(value) {
      var dim = parseBits(value, 32);
      var flags = parseBits(value, 32, 32);
      var elementType = parseBits(value, 32, 64);
      var offset = 96;
      var dims = [];
      for (var i = 0; i < dim; i++) {
        dims[i] = parseBits(value, 32, offset);
        offset += 32;
        offset += 32;
      }
      var parseElement = function(elementType2) {
        var length = parseBits(value, 32, offset);
        offset += 32;
        if (length == 4294967295) {
          return null;
        }
        var result;
        if (elementType2 == 23 || elementType2 == 20) {
          result = parseBits(value, length * 8, offset);
          offset += length * 8;
          return result;
        } else if (elementType2 == 25) {
          result = value.toString(this.encoding, offset >> 3, (offset += length << 3) >> 3);
          return result;
        } else {
          console.log("ERROR: ElementType not implemented: " + elementType2);
        }
      };
      var parse = function(dimension, elementType2) {
        var array = [];
        var i2;
        if (dimension.length > 1) {
          var count = dimension.shift();
          for (i2 = 0; i2 < count; i2++) {
            array[i2] = parse(dimension, elementType2);
          }
          dimension.unshift(count);
        } else {
          for (i2 = 0; i2 < dimension[0]; i2++) {
            array[i2] = parseElement(elementType2);
          }
        }
        return array;
      };
      return parse(dims, elementType);
    };
    var parseText = function(value) {
      return value.toString("utf8");
    };
    var parseBool = function(value) {
      if (value === null) return null;
      return parseBits(value, 8) > 0;
    };
    var init = function(register) {
      register(20, parseInt64);
      register(21, parseInt16);
      register(23, parseInt32);
      register(26, parseInt32);
      register(1700, parseNumeric);
      register(700, parseFloat32);
      register(701, parseFloat64);
      register(16, parseBool);
      register(1114, parseDate.bind(null, false));
      register(1184, parseDate.bind(null, true));
      register(1e3, parseArray);
      register(1007, parseArray);
      register(1016, parseArray);
      register(1008, parseArray);
      register(1009, parseArray);
      register(25, parseText);
    };
    module2.exports = {
      init
    };
  }
});

// node_modules/.pnpm/pg-types@2.2.0/node_modules/pg-types/lib/builtins.js
var require_builtins = __commonJS({
  "node_modules/.pnpm/pg-types@2.2.0/node_modules/pg-types/lib/builtins.js"(exports2, module2) {
    module2.exports = {
      BOOL: 16,
      BYTEA: 17,
      CHAR: 18,
      INT8: 20,
      INT2: 21,
      INT4: 23,
      REGPROC: 24,
      TEXT: 25,
      OID: 26,
      TID: 27,
      XID: 28,
      CID: 29,
      JSON: 114,
      XML: 142,
      PG_NODE_TREE: 194,
      SMGR: 210,
      PATH: 602,
      POLYGON: 604,
      CIDR: 650,
      FLOAT4: 700,
      FLOAT8: 701,
      ABSTIME: 702,
      RELTIME: 703,
      TINTERVAL: 704,
      CIRCLE: 718,
      MACADDR8: 774,
      MONEY: 790,
      MACADDR: 829,
      INET: 869,
      ACLITEM: 1033,
      BPCHAR: 1042,
      VARCHAR: 1043,
      DATE: 1082,
      TIME: 1083,
      TIMESTAMP: 1114,
      TIMESTAMPTZ: 1184,
      INTERVAL: 1186,
      TIMETZ: 1266,
      BIT: 1560,
      VARBIT: 1562,
      NUMERIC: 1700,
      REFCURSOR: 1790,
      REGPROCEDURE: 2202,
      REGOPER: 2203,
      REGOPERATOR: 2204,
      REGCLASS: 2205,
      REGTYPE: 2206,
      UUID: 2950,
      TXID_SNAPSHOT: 2970,
      PG_LSN: 3220,
      PG_NDISTINCT: 3361,
      PG_DEPENDENCIES: 3402,
      TSVECTOR: 3614,
      TSQUERY: 3615,
      GTSVECTOR: 3642,
      REGCONFIG: 3734,
      REGDICTIONARY: 3769,
      JSONB: 3802,
      REGNAMESPACE: 4089,
      REGROLE: 4096
    };
  }
});

// node_modules/.pnpm/pg-types@2.2.0/node_modules/pg-types/index.js
var require_pg_types = __commonJS({
  "node_modules/.pnpm/pg-types@2.2.0/node_modules/pg-types/index.js"(exports2) {
    var textParsers = require_textParsers();
    var binaryParsers = require_binaryParsers();
    var arrayParser = require_arrayParser();
    var builtinTypes = require_builtins();
    exports2.getTypeParser = getTypeParser;
    exports2.setTypeParser = setTypeParser;
    exports2.arrayParser = arrayParser;
    exports2.builtins = builtinTypes;
    var typeParsers = {
      text: {},
      binary: {}
    };
    function noParse(val) {
      return String(val);
    }
    function getTypeParser(oid, format) {
      format = format || "text";
      if (!typeParsers[format]) {
        return noParse;
      }
      return typeParsers[format][oid] || noParse;
    }
    function setTypeParser(oid, format, parseFn) {
      if (typeof format == "function") {
        parseFn = format;
        format = "text";
      }
      typeParsers[format][oid] = parseFn;
    }
    textParsers.init(function(oid, converter) {
      typeParsers.text[oid] = converter;
    });
    binaryParsers.init(function(oid, converter) {
      typeParsers.binary[oid] = converter;
    });
  }
});

// node_modules/.pnpm/pg@8.23.1/node_modules/pg/lib/defaults.js
var require_defaults2 = __commonJS({
  "node_modules/.pnpm/pg@8.23.1/node_modules/pg/lib/defaults.js"(exports2, module2) {
    "use strict";
    var user;
    try {
      user = process.platform === "win32" ? process.env.USERNAME : process.env.USER;
    } catch {
    }
    module2.exports = {
      // database host. defaults to localhost
      host: "localhost",
      // database user's name
      user,
      // name of database to connect
      database: void 0,
      // database user's password
      password: null,
      // a Postgres connection string to be used instead of setting individual connection items
      // NOTE:  Setting this value will cause it to override any other value (such as database or user) defined
      // in the defaults object.
      connectionString: void 0,
      // database port
      port: 5432,
      // number of rows to return at a time from a prepared statement's
      // portal. 0 will return all rows at once
      rows: 0,
      // binary result mode
      binary: false,
      // Connection pool options - see https://github.com/brianc/node-pg-pool
      // number of connections to use in connection pool
      // 0 will disable connection pooling
      max: 10,
      // max milliseconds a client can go unused before it is removed
      // from the pool and destroyed
      idleTimeoutMillis: 3e4,
      client_encoding: "",
      ssl: false,
      // SSL negotiation style: 'postgres' (traditional SSLRequest) or 'direct'
      sslnegotiation: void 0,
      application_name: void 0,
      fallback_application_name: void 0,
      options: void 0,
      parseInputDatesAsUTC: false,
      // max milliseconds any query using this connection will execute for before timing out in error.
      // false=unlimited
      statement_timeout: false,
      // Abort any statement that waits longer than the specified duration in milliseconds while attempting to acquire a lock.
      // false=unlimited
      lock_timeout: false,
      // Terminate any session with an open transaction that has been idle for longer than the specified duration in milliseconds
      // false=unlimited
      idle_in_transaction_session_timeout: false,
      // max milliseconds to wait for query to complete (client side)
      query_timeout: false,
      connect_timeout: 0,
      keepalives: 1,
      keepalives_idle: 0
    };
    var pgTypes = require_pg_types();
    var parseBigInteger = pgTypes.getTypeParser(20, "text");
    var parseBigIntegerArray = pgTypes.getTypeParser(1016, "text");
    module2.exports.__defineSetter__("parseInt8", function(val) {
      pgTypes.setTypeParser(20, "text", val ? pgTypes.getTypeParser(23, "text") : parseBigInteger);
      pgTypes.setTypeParser(1016, "text", val ? pgTypes.getTypeParser(1007, "text") : parseBigIntegerArray);
    });
  }
});

// node_modules/.pnpm/pg@8.23.1/node_modules/pg/lib/utils.js
var require_utils2 = __commonJS({
  "node_modules/.pnpm/pg@8.23.1/node_modules/pg/lib/utils.js"(exports2, module2) {
    "use strict";
    var defaults2 = require_defaults2();
    var nodeUtils = require("util");
    var { isDate } = require("util/types");
    var invalidDateDeprecationNotice = nodeUtils.deprecate(
      () => {
      },
      "Sending an invalid date to Postgres is deprecated and will throw an error in the next major version of pg. Ensure any Date object passed as a query parameter is valid.",
      "PG_INVALID_DATE"
    );
    function escapeElement(elementRepresentation) {
      const escaped = elementRepresentation.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      return '"' + escaped + '"';
    }
    function arrayString(val) {
      let result = "{";
      for (let i = 0; i < val.length; i++) {
        if (i > 0) {
          result += ",";
        }
        let item = val[i];
        if (item == null) {
          result += "NULL";
        } else if (Array.isArray(item)) {
          result += arrayString(item);
        } else if (ArrayBuffer.isView(item)) {
          if (!(item instanceof Buffer)) {
            item = Buffer.from(item.buffer, item.byteOffset, item.byteLength);
          }
          result += "\\\\x" + item.toString("hex");
        } else {
          result += escapeElement(prepareValue(item));
        }
      }
      result += "}";
      return result;
    }
    var prepareValue = function(val, seen) {
      if (val == null) {
        return null;
      }
      if (typeof val === "object") {
        if (val instanceof Buffer) {
          return val;
        }
        if (ArrayBuffer.isView(val)) {
          return Buffer.from(val.buffer, val.byteOffset, val.byteLength);
        }
        if (isDate(val)) {
          if (isNaN(val.getTime())) {
            invalidDateDeprecationNotice();
          }
          if (defaults2.parseInputDatesAsUTC) {
            return dateToStringUTC(val);
          } else {
            return dateToString(val);
          }
        }
        if (Array.isArray(val)) {
          return arrayString(val);
        }
        return prepareObject(val, seen);
      }
      return val.toString();
    };
    function prepareObject(val, seen) {
      if (val && typeof val.toPostgres === "function") {
        seen = seen || [];
        if (seen.indexOf(val) !== -1) {
          throw new Error('circular reference detected while preparing "' + val + '" for query');
        }
        seen.push(val);
        return prepareValue(val.toPostgres(prepareValue), seen);
      }
      return JSON.stringify(val);
    }
    function dateToString(date3) {
      let offset = -date3.getTimezoneOffset();
      let year = date3.getFullYear();
      const isBCYear = year < 1;
      if (isBCYear) year = Math.abs(year) + 1;
      let ret = String(year).padStart(4, "0") + "-" + String(date3.getMonth() + 1).padStart(2, "0") + "-" + String(date3.getDate()).padStart(2, "0") + "T" + String(date3.getHours()).padStart(2, "0") + ":" + String(date3.getMinutes()).padStart(2, "0") + ":" + String(date3.getSeconds()).padStart(2, "0") + "." + String(date3.getMilliseconds()).padStart(3, "0");
      if (offset < 0) {
        ret += "-";
        offset *= -1;
      } else {
        ret += "+";
      }
      ret += String(Math.floor(offset / 60)).padStart(2, "0") + ":" + String(offset % 60).padStart(2, "0");
      if (isBCYear) ret += " BC";
      return ret;
    }
    function dateToStringUTC(date3) {
      let year = date3.getUTCFullYear();
      const isBCYear = year < 1;
      if (isBCYear) year = Math.abs(year) + 1;
      let ret = String(year).padStart(4, "0") + "-" + String(date3.getUTCMonth() + 1).padStart(2, "0") + "-" + String(date3.getUTCDate()).padStart(2, "0") + "T" + String(date3.getUTCHours()).padStart(2, "0") + ":" + String(date3.getUTCMinutes()).padStart(2, "0") + ":" + String(date3.getUTCSeconds()).padStart(2, "0") + "." + String(date3.getUTCMilliseconds()).padStart(3, "0");
      ret += "+00:00";
      if (isBCYear) ret += " BC";
      return ret;
    }
    function normalizeQueryConfig(config, values, callback) {
      config = typeof config === "string" ? { text: config } : cloneQueryConfig(config);
      if (values) {
        if (typeof values === "function") {
          config.callback = values;
        } else {
          config.values = values;
        }
      }
      if (callback) {
        config.callback = callback;
      }
      return config;
    }
    function cloneQueryConfig(config) {
      if (config == null) {
        return config;
      }
      return Object.defineProperties(Object.create(Object.getPrototypeOf(config)), Object.getOwnPropertyDescriptors(config));
    }
    var escapeIdentifier2 = function(str) {
      return '"' + str.replace(/"/g, '""') + '"';
    };
    var escapeLiteral2 = function(str) {
      let hasBackslash = false;
      let escaped = "'";
      if (str == null) {
        return "''";
      }
      if (typeof str !== "string") {
        return "''";
      }
      for (let i = 0; i < str.length; i++) {
        const c = str[i];
        if (c === "'") {
          escaped += c + c;
        } else if (c === "\\") {
          escaped += c + c;
          hasBackslash = true;
        } else {
          escaped += c;
        }
      }
      escaped += "'";
      if (hasBackslash === true) {
        escaped = " E" + escaped;
      }
      return escaped;
    };
    module2.exports = {
      prepareValue: function prepareValueWrapper(value) {
        return prepareValue(value);
      },
      normalizeQueryConfig,
      escapeIdentifier: escapeIdentifier2,
      escapeLiteral: escapeLiteral2
    };
  }
});

// node_modules/.pnpm/pg@8.23.1/node_modules/pg/lib/crypto/utils.js
var require_utils3 = __commonJS({
  "node_modules/.pnpm/pg@8.23.1/node_modules/pg/lib/crypto/utils.js"(exports2, module2) {
    var nodeCrypto = require("crypto");
    module2.exports = {
      postgresMd5PasswordHash,
      randomBytes,
      deriveKey,
      sha256,
      hashByName,
      hmacSha256,
      md5
    };
    var webCrypto = nodeCrypto.webcrypto || globalThis.crypto;
    var subtleCrypto = webCrypto.subtle;
    var textEncoder = new TextEncoder();
    function randomBytes(length) {
      return webCrypto.getRandomValues(Buffer.alloc(length));
    }
    async function md5(string) {
      try {
        return nodeCrypto.createHash("md5").update(string, "utf-8").digest("hex");
      } catch (e) {
        const data = typeof string === "string" ? textEncoder.encode(string) : string;
        const hash = await subtleCrypto.digest("MD5", data);
        return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
      }
    }
    async function postgresMd5PasswordHash(user, password, salt) {
      const inner = await md5(password + user);
      const outer = await md5(Buffer.concat([Buffer.from(inner), salt]));
      return "md5" + outer;
    }
    async function sha256(text3) {
      return await subtleCrypto.digest("SHA-256", text3);
    }
    async function hashByName(hashName, text3) {
      return await subtleCrypto.digest(hashName, text3);
    }
    async function hmacSha256(keyBuffer, msg) {
      const key = await subtleCrypto.importKey("raw", keyBuffer, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
      return await subtleCrypto.sign("HMAC", key, textEncoder.encode(msg));
    }
    async function deriveKey(password, salt, iterations) {
      const key = await subtleCrypto.importKey("raw", textEncoder.encode(password), "PBKDF2", false, ["deriveBits"]);
      const params = { name: "PBKDF2", hash: "SHA-256", salt, iterations };
      return await subtleCrypto.deriveBits(params, key, 32 * 8, ["deriveBits"]);
    }
  }
});

// node_modules/.pnpm/pg@8.23.1/node_modules/pg/lib/crypto/cert-signatures.js
var require_cert_signatures = __commonJS({
  "node_modules/.pnpm/pg@8.23.1/node_modules/pg/lib/crypto/cert-signatures.js"(exports2, module2) {
    function x509Error(msg, cert) {
      return new Error("SASL channel binding: " + msg + " when parsing public certificate " + cert.toString("base64"));
    }
    function readASN1Length(data, index) {
      let length = data[index++];
      if (length < 128) return { length, index };
      const lengthBytes = length & 127;
      if (lengthBytes > 4) throw x509Error("bad length", data);
      length = 0;
      for (let i = 0; i < lengthBytes; i++) {
        length = length << 8 | data[index++];
      }
      return { length, index };
    }
    function readASN1OID(data, index) {
      if (data[index++] !== 6) throw x509Error("non-OID data", data);
      const { length: OIDLength, index: indexAfterOIDLength } = readASN1Length(data, index);
      index = indexAfterOIDLength;
      const lastIndex = index + OIDLength;
      const byte1 = data[index++];
      let oid = (byte1 / 40 >> 0) + "." + byte1 % 40;
      while (index < lastIndex) {
        let value = 0;
        while (index < lastIndex) {
          const nextByte = data[index++];
          value = value << 7 | nextByte & 127;
          if (nextByte < 128) break;
        }
        oid += "." + value;
      }
      return { oid, index };
    }
    function expectASN1Seq(data, index) {
      if (data[index++] !== 48) throw x509Error("non-sequence data", data);
      return readASN1Length(data, index);
    }
    function signatureAlgorithmHashFromCertificate(data, index) {
      if (index === void 0) index = 0;
      index = expectASN1Seq(data, index).index;
      const { length: certInfoLength, index: indexAfterCertInfoLength } = expectASN1Seq(data, index);
      index = indexAfterCertInfoLength + certInfoLength;
      index = expectASN1Seq(data, index).index;
      const { oid, index: indexAfterOID } = readASN1OID(data, index);
      switch (oid) {
        // RSA
        case "1.2.840.113549.1.1.4":
          return "MD5";
        case "1.2.840.113549.1.1.5":
          return "SHA-1";
        case "1.2.840.113549.1.1.11":
          return "SHA-256";
        case "1.2.840.113549.1.1.12":
          return "SHA-384";
        case "1.2.840.113549.1.1.13":
          return "SHA-512";
        case "1.2.840.113549.1.1.14":
          return "SHA-224";
        case "1.2.840.113549.1.1.15":
          return "SHA512-224";
        case "1.2.840.113549.1.1.16":
          return "SHA512-256";
        // ECDSA
        case "1.2.840.10045.4.1":
          return "SHA-1";
        case "1.2.840.10045.4.3.1":
          return "SHA-224";
        case "1.2.840.10045.4.3.2":
          return "SHA-256";
        case "1.2.840.10045.4.3.3":
          return "SHA-384";
        case "1.2.840.10045.4.3.4":
          return "SHA-512";
        // RSASSA-PSS: hash is indicated separately
        case "1.2.840.113549.1.1.10": {
          index = indexAfterOID;
          index = expectASN1Seq(data, index).index;
          if (data[index++] !== 160) throw x509Error("non-tag data", data);
          index = readASN1Length(data, index).index;
          index = expectASN1Seq(data, index).index;
          const { oid: hashOID } = readASN1OID(data, index);
          switch (hashOID) {
            // standalone hash OIDs
            case "1.2.840.113549.2.5":
              return "MD5";
            case "1.3.14.3.2.26":
              return "SHA-1";
            case "2.16.840.1.101.3.4.2.1":
              return "SHA-256";
            case "2.16.840.1.101.3.4.2.2":
              return "SHA-384";
            case "2.16.840.1.101.3.4.2.3":
              return "SHA-512";
          }
          throw x509Error("unknown hash OID " + hashOID, data);
        }
        // Ed25519 -- see https://github.com/openssl/openssl/issues/15477
        case "1.3.101.110":
        case "1.3.101.112":
          return "SHA-512";
        // Ed448 -- still not in pg 17.2 (if supported, digest would be SHAKE256 x 64 bytes)
        case "1.3.101.111":
        case "1.3.101.113":
          throw x509Error("Ed448 certificate channel binding is not currently supported by Postgres");
      }
      throw x509Error("unknown OID " + oid, data);
    }
    module2.exports = { signatureAlgorithmHashFromCertificate };
  }
});

// node_modules/.pnpm/pg@8.23.1/node_modules/pg/lib/crypto/sasl.js
var require_sasl = __commonJS({
  "node_modules/.pnpm/pg@8.23.1/node_modules/pg/lib/crypto/sasl.js"(exports2, module2) {
    "use strict";
    var crypto = require_utils3();
    var { signatureAlgorithmHashFromCertificate } = require_cert_signatures();
    function saslprep(password) {
      const nonAsciiSpace = /[\u00A0\u1680\u2000-\u200B\u202F\u205F\u3000]/g;
      const mappedToNothing = /[\u00AD\u034F\u1806\u180B\u180C\u180D\u200C\u200D\u2060\uFE00-\uFE0F\uFEFF]/g;
      return password.replace(nonAsciiSpace, " ").replace(mappedToNothing, "").normalize("NFKC");
    }
    var DEFAULT_MAX_SCRAM_ITERATIONS = 1e5;
    function startSession(mechanisms, stream, scramMaxIterations = DEFAULT_MAX_SCRAM_ITERATIONS) {
      const candidates = ["SCRAM-SHA-256"];
      if (stream) candidates.unshift("SCRAM-SHA-256-PLUS");
      const mechanism = candidates.find((candidate) => mechanisms.includes(candidate));
      if (!mechanism) {
        throw new Error("SASL: Only mechanism(s) " + candidates.join(" and ") + " are supported");
      }
      if (mechanism === "SCRAM-SHA-256-PLUS" && typeof stream.getPeerCertificate !== "function") {
        throw new Error("SASL: Mechanism SCRAM-SHA-256-PLUS requires a certificate");
      }
      const clientNonce = crypto.randomBytes(18).toString("base64");
      const gs2Header = mechanism === "SCRAM-SHA-256-PLUS" ? "p=tls-server-end-point" : stream ? "y" : "n";
      return {
        mechanism,
        clientNonce,
        response: gs2Header + ",,n=*,r=" + clientNonce,
        message: "SASLInitialResponse",
        scramMaxIterations
      };
    }
    async function continueSession(session, password, serverData, stream) {
      if (session.message !== "SASLInitialResponse") {
        throw new Error("SASL: Last message was not SASLInitialResponse");
      }
      if (typeof password !== "string") {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string");
      }
      if (password === "") {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a non-empty string");
      }
      if (typeof serverData !== "string") {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: serverData must be a string");
      }
      const sv = parseServerFirstMessage(serverData);
      if (!sv.nonce.startsWith(session.clientNonce)) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: server nonce does not start with client nonce");
      } else if (sv.nonce.length === session.clientNonce.length) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: server nonce is too short");
      }
      const scramMaxIterations = typeof session.scramMaxIterations === "number" ? session.scramMaxIterations : DEFAULT_MAX_SCRAM_ITERATIONS;
      if (scramMaxIterations !== 0 && sv.iteration > scramMaxIterations) {
        throw new Error(
          "SASL: SCRAM-SERVER-FIRST-MESSAGE: iteration count " + sv.iteration + " exceeds scramMaxIterations of " + scramMaxIterations
        );
      }
      const clientFirstMessageBare = "n=*,r=" + session.clientNonce;
      const serverFirstMessage = "r=" + sv.nonce + ",s=" + sv.salt + ",i=" + sv.iteration;
      let channelBinding = stream ? "eSws" : "biws";
      if (session.mechanism === "SCRAM-SHA-256-PLUS") {
        const peerCert = stream.getPeerCertificate().raw;
        let hashName = signatureAlgorithmHashFromCertificate(peerCert);
        if (hashName === "MD5" || hashName === "SHA-1") hashName = "SHA-256";
        const certHash = await crypto.hashByName(hashName, peerCert);
        const bindingData = Buffer.concat([Buffer.from("p=tls-server-end-point,,"), Buffer.from(certHash)]);
        channelBinding = bindingData.toString("base64");
      }
      const clientFinalMessageWithoutProof = "c=" + channelBinding + ",r=" + sv.nonce;
      const authMessage = clientFirstMessageBare + "," + serverFirstMessage + "," + clientFinalMessageWithoutProof;
      const saltBytes = Buffer.from(sv.salt, "base64");
      const saltedPassword = await crypto.deriveKey(saslprep(password), saltBytes, sv.iteration);
      const clientKey = await crypto.hmacSha256(saltedPassword, "Client Key");
      const storedKey = await crypto.sha256(clientKey);
      const clientSignature = await crypto.hmacSha256(storedKey, authMessage);
      const clientProof = xorBuffers(Buffer.from(clientKey), Buffer.from(clientSignature)).toString("base64");
      const serverKey = await crypto.hmacSha256(saltedPassword, "Server Key");
      const serverSignatureBytes = await crypto.hmacSha256(serverKey, authMessage);
      session.message = "SASLResponse";
      session.serverSignature = Buffer.from(serverSignatureBytes).toString("base64");
      session.response = clientFinalMessageWithoutProof + ",p=" + clientProof;
    }
    function finalizeSession(session, serverData) {
      if (session.message !== "SASLResponse") {
        throw new Error("SASL: Last message was not SASLResponse");
      }
      if (typeof serverData !== "string") {
        throw new Error("SASL: SCRAM-SERVER-FINAL-MESSAGE: serverData must be a string");
      }
      const { serverSignature } = parseServerFinalMessage(serverData);
      if (serverSignature !== session.serverSignature) {
        throw new Error("SASL: SCRAM-SERVER-FINAL-MESSAGE: server signature does not match");
      }
    }
    function isPrintableChars(text3) {
      if (typeof text3 !== "string") {
        throw new TypeError("SASL: text must be a string");
      }
      return text3.split("").map((_, i) => text3.charCodeAt(i)).every((c) => c >= 33 && c <= 43 || c >= 45 && c <= 126);
    }
    function isBase64(text3) {
      return /^(?:[a-zA-Z0-9+/]{4})*(?:[a-zA-Z0-9+/]{2}==|[a-zA-Z0-9+/]{3}=)?$/.test(text3);
    }
    function parseAttributePairs(text3) {
      if (typeof text3 !== "string") {
        throw new TypeError("SASL: attribute pairs text must be a string");
      }
      return new Map(
        text3.split(",").map((attrValue) => {
          if (!/^.=/.test(attrValue)) {
            throw new Error("SASL: Invalid attribute pair entry");
          }
          const name = attrValue[0];
          const value = attrValue.substring(2);
          return [name, value];
        })
      );
    }
    function parseServerFirstMessage(data) {
      const attrPairs = parseAttributePairs(data);
      const nonce = attrPairs.get("r");
      if (!nonce) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: nonce missing");
      } else if (!isPrintableChars(nonce)) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: nonce must only contain printable characters");
      }
      const salt = attrPairs.get("s");
      if (!salt) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: salt missing");
      } else if (!isBase64(salt)) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: salt must be base64");
      }
      const iterationText = attrPairs.get("i");
      if (!iterationText) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: iteration missing");
      } else if (!/^[1-9][0-9]*$/.test(iterationText)) {
        throw new Error("SASL: SCRAM-SERVER-FIRST-MESSAGE: invalid iteration count");
      }
      const iteration = parseInt(iterationText, 10);
      return {
        nonce,
        salt,
        iteration
      };
    }
    function parseServerFinalMessage(serverData) {
      const attrPairs = parseAttributePairs(serverData);
      const error = attrPairs.get("e");
      const serverSignature = attrPairs.get("v");
      if (error) {
        throw new Error(`SASL: SCRAM-SERVER-FINAL-MESSAGE: server returned error: "${error}"`);
      }
      if (!serverSignature) {
        throw new Error("SASL: SCRAM-SERVER-FINAL-MESSAGE: server signature is missing");
      } else if (!isBase64(serverSignature)) {
        throw new Error("SASL: SCRAM-SERVER-FINAL-MESSAGE: server signature must be base64");
      }
      return {
        serverSignature
      };
    }
    function xorBuffers(a, b) {
      if (!Buffer.isBuffer(a)) {
        throw new TypeError("first argument must be a Buffer");
      }
      if (!Buffer.isBuffer(b)) {
        throw new TypeError("second argument must be a Buffer");
      }
      if (a.length !== b.length) {
        throw new Error("Buffer lengths must match");
      }
      if (a.length === 0) {
        throw new Error("Buffers cannot be empty");
      }
      return Buffer.from(a.map((_, i) => a[i] ^ b[i]));
    }
    module2.exports = {
      startSession,
      continueSession,
      finalizeSession,
      DEFAULT_MAX_SCRAM_ITERATIONS
    };
  }
});

// node_modules/.pnpm/pg@8.23.1/node_modules/pg/lib/type-overrides.js
var require_type_overrides = __commonJS({
  "node_modules/.pnpm/pg@8.23.1/node_modules/pg/lib/type-overrides.js"(exports2, module2) {
    "use strict";
    var types2 = require_pg_types();
    function TypeOverrides2(userTypes) {
      this._types = userTypes || types2;
      this.text = {};
      this.binary = {};
    }
    TypeOverrides2.prototype.getOverrides = function(format) {
      switch (format) {
        case "text":
          return this.text;
        case "binary":
          return this.binary;
        default:
          return {};
      }
    };
    TypeOverrides2.prototype.setTypeParser = function(oid, format, parseFn) {
      if (typeof format === "function") {
        parseFn = format;
        format = "text";
      }
      this.getOverrides(format)[oid] = parseFn;
    };
    TypeOverrides2.prototype.getTypeParser = function(oid, format) {
      format = format || "text";
      return this.getOverrides(format)[oid] || this._types.getTypeParser(oid, format);
    };
    module2.exports = TypeOverrides2;
  }
});

// node_modules/.pnpm/pg-connection-string@2.14.1/node_modules/pg-connection-string/index.js
var require_pg_connection_string = __commonJS({
  "node_modules/.pnpm/pg-connection-string@2.14.1/node_modules/pg-connection-string/index.js"(exports2, module2) {
    "use strict";
    function parse(str, options = {}) {
      if (str.charAt(0) === "/") {
        const config2 = str.split(" ");
        return { host: config2[0], database: config2[1] };
      }
      const config = /* @__PURE__ */ Object.create(null);
      let result;
      let dummyHost = false;
      if (/ |%[^a-f0-9]|%[a-f0-9][^a-f0-9]/i.test(str)) {
        str = encodeURI(str).replace(/%25(\d\d)/g, "%$1");
      }
      try {
        try {
          result = new URL(str, "postgres://base");
        } catch (e) {
          result = new URL(str.replace("@/", "@___DUMMY___/"), "postgres://base");
          dummyHost = true;
        }
      } catch (err) {
        err.input && (err.input = "*****REDACTED*****");
        throw err;
      }
      for (const entry of result.searchParams.entries()) {
        config[entry[0]] = entry[1];
      }
      config.user = config.user || decodeURIComponent(result.username);
      config.password = config.password || decodeURIComponent(result.password);
      if (result.protocol == "socket:") {
        config.host = decodeURI(result.pathname);
        config.database = result.searchParams.get("db");
        config.client_encoding = result.searchParams.get("encoding");
        return config;
      }
      const hostname = (dummyHost ? "" : result.hostname).replace(/^\[(.+)\]$/, "$1");
      if (!config.host) {
        config.host = decodeURIComponent(hostname);
      } else if (hostname && /^%2f/i.test(hostname)) {
        result.pathname = hostname + result.pathname;
      }
      if (!config.port) {
        config.port = result.port;
      }
      const pathname = result.pathname.slice(1) || null;
      config.database = pathname ? decodeURI(pathname) : null;
      if (config.ssl === "true" || config.ssl === "1") {
        config.ssl = true;
      }
      if (config.ssl === "0") {
        config.ssl = false;
      }
      if (config.sslcert || config.sslkey || config.sslrootcert || config.sslmode) {
        config.ssl = {};
      }
      if (config.sslnegotiation === "direct" && config.ssl === void 0) {
        config.ssl = true;
      }
      const fs = config.sslcert || config.sslkey || config.sslrootcert ? require("fs") : null;
      if (config.sslcert) {
        config.ssl.cert = fs.readFileSync(config.sslcert).toString();
      }
      if (config.sslkey) {
        config.ssl.key = fs.readFileSync(config.sslkey).toString();
      }
      if (config.sslrootcert) {
        config.ssl.ca = fs.readFileSync(config.sslrootcert).toString();
      }
      if (options.useLibpqCompat && config.uselibpqcompat) {
        throw new Error("Both useLibpqCompat and uselibpqcompat are set. Please use only one of them.");
      }
      if (config.uselibpqcompat === "true" || options.useLibpqCompat) {
        switch (config.sslmode) {
          case "disable": {
            config.ssl = false;
            break;
          }
          case "prefer": {
            config.ssl.rejectUnauthorized = false;
            break;
          }
          case "require": {
            if (config.sslrootcert) {
              config.ssl.checkServerIdentity = function() {
              };
            } else {
              config.ssl.rejectUnauthorized = false;
            }
            break;
          }
          case "verify-ca": {
            if (!config.ssl.ca) {
              throw new Error(
                "SECURITY WARNING: Using sslmode=verify-ca requires specifying a CA with sslrootcert. If a public CA is used, verify-ca allows connections to a server that somebody else may have registered with the CA, making you vulnerable to Man-in-the-Middle attacks. Either specify a custom CA certificate with sslrootcert parameter or use sslmode=verify-full for proper security."
              );
            }
            config.ssl.checkServerIdentity = function() {
            };
            break;
          }
          case "verify-full": {
            break;
          }
        }
      } else {
        switch (config.sslmode) {
          case "disable": {
            config.ssl = false;
            break;
          }
          case "prefer":
          case "require":
          case "verify-ca":
          case "verify-full": {
            if (config.sslmode !== "verify-full") {
              deprecatedSslModeWarning(config.sslmode);
            }
            break;
          }
          case "no-verify": {
            config.ssl.rejectUnauthorized = false;
            break;
          }
        }
      }
      return config;
    }
    function toConnectionOptions(sslConfig) {
      const connectionOptions = Object.entries(sslConfig).reduce((c, [key, value]) => {
        if (value !== void 0 && value !== null) {
          c[key] = value;
        }
        return c;
      }, /* @__PURE__ */ Object.create(null));
      return connectionOptions;
    }
    function toClientConfig(config) {
      const poolConfig = Object.entries(config).reduce((c, [key, value]) => {
        if (key === "ssl") {
          const sslConfig = value;
          if (typeof sslConfig === "boolean") {
            c[key] = sslConfig;
          }
          if (typeof sslConfig === "object") {
            c[key] = toConnectionOptions(sslConfig);
          }
        } else if (value !== void 0 && value !== null) {
          if (key === "port") {
            if (value !== "") {
              const v = parseInt(value, 10);
              if (isNaN(v)) {
                throw new Error(`Invalid ${key}: ${value}`);
              }
              c[key] = v;
            }
          } else {
            c[key] = value;
          }
        }
        return c;
      }, /* @__PURE__ */ Object.create(null));
      return poolConfig;
    }
    function parseIntoClientConfig(str) {
      return toClientConfig(parse(str));
    }
    function deprecatedSslModeWarning(sslmode) {
      if (!deprecatedSslModeWarning.warned && typeof process !== "undefined" && process.emitWarning) {
        deprecatedSslModeWarning.warned = true;
        process.emitWarning(`SECURITY WARNING: The SSL modes 'prefer', 'require', and 'verify-ca' are treated as aliases for 'verify-full'.
In the next major version (pg-connection-string v3.0.0 and pg v9.0.0), these modes will adopt standard libpq semantics, which have weaker security guarantees.

To prepare for this change:
- If you want the current behavior, explicitly use 'sslmode=verify-full'
- If you want libpq compatibility now, use 'uselibpqcompat=true&sslmode=${sslmode}'

See https://www.postgresql.org/docs/current/libpq-ssl.html for libpq SSL mode definitions.`);
      }
    }
    module2.exports = parse;
    parse.parse = parse;
    parse.toClientConfig = toClientConfig;
    parse.parseIntoClientConfig = parseIntoClientConfig;
  }
});

// node_modules/.pnpm/pg@8.23.1/node_modules/pg/lib/connection-parameters.js
var require_connection_parameters = __commonJS({
  "node_modules/.pnpm/pg@8.23.1/node_modules/pg/lib/connection-parameters.js"(exports2, module2) {
    "use strict";
    var dns = require("dns");
    var defaults2 = require_defaults2();
    var parse = require_pg_connection_string().parse;
    var val = function(key, config, envVar) {
      if (config[key]) {
        return config[key];
      }
      if (envVar === void 0) {
        envVar = process.env["PG" + key.toUpperCase()];
      } else if (envVar === false) {
      } else {
        envVar = process.env[envVar];
      }
      return envVar || defaults2[key];
    };
    var readSSLConfigFromEnvironment = function() {
      switch (process.env.PGSSLMODE) {
        case "disable":
          return false;
        case "prefer":
        case "require":
        case "verify-ca":
        case "verify-full":
          return true;
        case "no-verify":
          return { rejectUnauthorized: false };
      }
      return defaults2.ssl;
    };
    var quoteParamValue = function(value) {
      return "'" + ("" + value).replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'";
    };
    var add = function(params, config, paramName) {
      const value = config[paramName];
      if (value !== void 0 && value !== null) {
        params.push(paramName + "=" + quoteParamValue(value));
      }
    };
    var ConnectionParameters = class {
      constructor(config) {
        config = typeof config === "string" ? parse(config) : config || {};
        if (config.connectionString) {
          config = Object.assign({}, config, parse(config.connectionString));
        }
        this.user = val("user", config);
        this.database = val("database", config);
        if (this.database === void 0) {
          this.database = this.user;
        }
        this.port = parseInt(val("port", config), 10);
        this.host = val("host", config);
        Object.defineProperty(this, "password", {
          configurable: true,
          enumerable: false,
          writable: true,
          value: val("password", config)
        });
        this.binary = val("binary", config);
        this.options = val("options", config);
        this.ssl = typeof config.ssl === "undefined" ? readSSLConfigFromEnvironment() : config.ssl;
        if (typeof this.ssl === "string") {
          if (this.ssl === "true") {
            this.ssl = true;
          }
        }
        if (this.ssl === "no-verify") {
          this.ssl = { rejectUnauthorized: false };
        }
        if (this.ssl && this.ssl.key) {
          Object.defineProperty(this.ssl, "key", {
            enumerable: false
          });
        }
        this.sslnegotiation = val("sslnegotiation", config, "PGSSLNEGOTIATION");
        if (this.sslnegotiation !== void 0 && this.sslnegotiation !== "postgres" && this.sslnegotiation !== "direct") {
          throw new Error(
            `Invalid sslnegotiation value: "${this.sslnegotiation}". Valid values are "postgres" and "direct".`
          );
        }
        if (this.sslnegotiation === "direct" && !this.ssl) {
          throw new Error("sslnegotiation=direct requires SSL to be enabled");
        }
        this.client_encoding = val("client_encoding", config);
        this.replication = val("replication", config);
        this.isDomainSocket = !(this.host || "").indexOf("/");
        this.application_name = val("application_name", config, "PGAPPNAME");
        this.fallback_application_name = val("fallback_application_name", config, false);
        this.statement_timeout = val("statement_timeout", config, false);
        this.lock_timeout = val("lock_timeout", config, false);
        this.idle_in_transaction_session_timeout = val("idle_in_transaction_session_timeout", config, false);
        this.query_timeout = val("query_timeout", config, false);
        if (config.connectionTimeoutMillis === void 0) {
          this.connect_timeout = process.env.PGCONNECT_TIMEOUT || 0;
        } else {
          this.connect_timeout = Math.floor(config.connectionTimeoutMillis / 1e3);
        }
        if (config.keepAlive === false) {
          this.keepalives = 0;
        } else if (config.keepAlive === true) {
          this.keepalives = 1;
        }
        if (typeof config.keepAliveInitialDelayMillis === "number") {
          this.keepalives_idle = Math.floor(config.keepAliveInitialDelayMillis / 1e3);
        }
      }
      getLibpqConnectionString(cb) {
        const params = [];
        add(params, this, "user");
        add(params, this, "password");
        add(params, this, "port");
        add(params, this, "application_name");
        add(params, this, "fallback_application_name");
        add(params, this, "connect_timeout");
        add(params, this, "options");
        const ssl = typeof this.ssl === "object" ? this.ssl : this.ssl ? { sslmode: this.ssl } : {};
        add(params, ssl, "sslmode");
        add(params, ssl, "sslca");
        add(params, ssl, "sslkey");
        add(params, ssl, "sslcert");
        add(params, ssl, "sslrootcert");
        add(params, this, "sslnegotiation");
        if (this.database) {
          params.push("dbname=" + quoteParamValue(this.database));
        }
        if (this.replication) {
          params.push("replication=" + quoteParamValue(this.replication));
        }
        if (this.host) {
          params.push("host=" + quoteParamValue(this.host));
        }
        if (this.isDomainSocket) {
          return cb(null, params.join(" "));
        }
        if (this.client_encoding) {
          params.push("client_encoding=" + quoteParamValue(this.client_encoding));
        }
        dns.lookup(this.host, function(err, address) {
          if (err) return cb(err, null);
          params.push("hostaddr=" + quoteParamValue(address));
          return cb(null, params.join(" "));
        });
      }
    };
    module2.exports = ConnectionParameters;
  }
});

// node_modules/.pnpm/pg@8.23.1/node_modules/pg/lib/result.js
var require_result = __commonJS({
  "node_modules/.pnpm/pg@8.23.1/node_modules/pg/lib/result.js"(exports2, module2) {
    "use strict";
    var types2 = require_pg_types();
    var matchRegexp = /^([A-Za-z]+)(?: (\d+))?(?: (\d+))?/;
    var Result2 = class {
      constructor(rowMode, types3) {
        this.command = null;
        this.rowCount = null;
        this.oid = null;
        this.rows = [];
        this.fields = [];
        this._parsers = void 0;
        this._types = types3;
        this.RowCtor = null;
        this.rowAsArray = rowMode === "array";
        if (this.rowAsArray) {
          this.parseRow = this._parseRowAsArray;
        }
        this._prebuiltEmptyResultObject = null;
      }
      // adds a command complete message
      addCommandComplete(msg) {
        let match;
        if (msg.text) {
          match = matchRegexp.exec(msg.text);
        } else {
          match = matchRegexp.exec(msg.command);
        }
        if (match) {
          this.command = match[1];
          if (match[3]) {
            this.oid = parseInt(match[2], 10);
            this.rowCount = parseInt(match[3], 10);
          } else if (match[2]) {
            this.rowCount = parseInt(match[2], 10);
          }
        }
      }
      _parseRowAsArray(rowData) {
        const row = new Array(rowData.length);
        for (let i = 0, len = rowData.length; i < len; i++) {
          const rawValue = rowData[i];
          if (rawValue !== null) {
            row[i] = this._parsers[i](rawValue);
          } else {
            row[i] = null;
          }
        }
        return row;
      }
      parseRow(rowData) {
        const row = { ...this._prebuiltEmptyResultObject };
        for (let i = 0, len = rowData.length; i < len; i++) {
          const rawValue = rowData[i];
          const field = this.fields[i].name;
          if (rawValue !== null) {
            const v = this.fields[i].format === "binary" ? Buffer.from(rawValue) : rawValue;
            row[field] = this._parsers[i](v);
          } else {
            row[field] = null;
          }
        }
        return row;
      }
      addRow(row) {
        this.rows.push(row);
      }
      addFields(fieldDescriptions) {
        this.fields = fieldDescriptions;
        if (this.fields.length) {
          this._parsers = new Array(fieldDescriptions.length);
        }
        const row = /* @__PURE__ */ Object.create(null);
        for (let i = 0; i < fieldDescriptions.length; i++) {
          const desc = fieldDescriptions[i];
          row[desc.name] = null;
          if (this._types) {
            this._parsers[i] = this._types.getTypeParser(desc.dataTypeID, desc.format || "text");
          } else {
            this._parsers[i] = types2.getTypeParser(desc.dataTypeID, desc.format || "text");
          }
        }
        this._prebuiltEmptyResultObject = { ...row };
      }
    };
    module2.exports = Result2;
  }
});

// node_modules/.pnpm/pg@8.23.1/node_modules/pg/lib/query.js
var require_query = __commonJS({
  "node_modules/.pnpm/pg@8.23.1/node_modules/pg/lib/query.js"(exports2, module2) {
    "use strict";
    var { EventEmitter } = require("events");
    var Result2 = require_result();
    var utils = require_utils2();
    var Query2 = class extends EventEmitter {
      constructor(config, values, callback) {
        super();
        config = utils.normalizeQueryConfig(config, values, callback);
        this.text = config.text;
        this.values = config.values;
        this.rows = config.rows;
        this.types = config.types;
        this.name = config.name;
        this.queryMode = config.queryMode;
        this.binary = config.binary;
        this.portal = config.portal || "";
        this.callback = config.callback;
        this._rowMode = config.rowMode;
        if (process.domain && config.callback) {
          this.callback = process.domain.bind(config.callback);
        }
        this._result = new Result2(this._rowMode, this.types);
        this._results = this._result;
        this._canceledDueToError = false;
      }
      requiresPreparation() {
        if (this.queryMode === "extended") {
          return true;
        }
        if (this.name) {
          return true;
        }
        if (this.rows) {
          return true;
        }
        if (!this.text) {
          return false;
        }
        if (!this.values) {
          return false;
        }
        return this.values.length > 0;
      }
      _checkForMultirow() {
        if (this._result.command) {
          if (!Array.isArray(this._results)) {
            this._results = [this._result];
          }
          this._result = new Result2(this._rowMode, this._result._types);
          this._results.push(this._result);
        }
      }
      // associates row metadata from the supplied
      // message with this query object
      // metadata used when parsing row results
      handleRowDescription(msg) {
        this._checkForMultirow();
        this._result.addFields(msg.fields);
        this._accumulateRows = this.callback || !this.listeners("row").length;
      }
      handleDataRow(msg) {
        let row;
        if (this._canceledDueToError) {
          return;
        }
        try {
          row = this._result.parseRow(msg.fields);
        } catch (err) {
          this._canceledDueToError = err;
          return;
        }
        this.emit("row", row, this._result);
        if (this._accumulateRows) {
          this._result.addRow(row);
        }
      }
      handleCommandComplete(msg, connection) {
        this._checkForMultirow();
        this._result.addCommandComplete(msg);
        if (this.rows) {
          connection.sync();
        }
      }
      // if a named prepared statement is created with empty query text
      // the backend will send an emptyQuery message but *not* a command complete message
      // since we pipeline sync immediately after execute we don't need to do anything here
      // unless we have rows specified, in which case we did not pipeline the initial sync call
      handleEmptyQuery(connection) {
        if (this.rows) {
          connection.sync();
        }
      }
      handleError(err, connection) {
        if (this._canceledDueToError) {
          err = this._canceledDueToError;
          this._canceledDueToError = false;
        }
        if (this.callback) {
          return this.callback(err);
        }
        this.emit("error", err);
      }
      handleReadyForQuery(con) {
        if (this._canceledDueToError) {
          return this.handleError(this._canceledDueToError, con);
        }
        if (this.callback) {
          try {
            this.callback(null, this._results);
          } catch (err) {
            process.nextTick(() => {
              throw err;
            });
          }
        }
        this.emit("end", this._results);
      }
      submit(connection) {
        if (typeof this.text !== "string" && typeof this.name !== "string") {
          return new Error("A query must have either text or a name. Supplying neither is unsupported.");
        }
        const previous = connection.parsedStatements[this.name] || connection.submittedNamedStatements[this.name];
        if (this.text && previous && this.text !== previous) {
          return new Error(`Prepared statements must be unique - '${this.name}' was used for a different statement`);
        }
        if (this.values && !Array.isArray(this.values)) {
          return new Error("Query values must be an array");
        }
        if (this.requiresPreparation()) {
          connection.stream.cork && connection.stream.cork();
          try {
            this.prepare(connection);
          } finally {
            connection.stream.uncork && connection.stream.uncork();
          }
        } else {
          connection.query(this.text);
        }
        return null;
      }
      hasBeenParsed(connection) {
        return this.name && (connection.parsedStatements[this.name] !== void 0 || connection.submittedNamedStatements[this.name] !== void 0);
      }
      handlePortalSuspended(connection) {
        this._getRows(connection, this.rows);
      }
      _getRows(connection, rows) {
        connection.execute({
          portal: this.portal,
          rows
        });
        if (!rows) {
          connection.sync();
        } else {
          connection.flush();
        }
      }
      // http://developer.postgresql.org/pgdocs/postgres/protocol-flow.html#PROTOCOL-FLOW-EXT-QUERY
      prepare(connection) {
        if (!this.hasBeenParsed(connection)) {
          connection.parse({
            text: this.text,
            name: this.name,
            types: this.types
          });
          if (this.name) {
            connection.submittedNamedStatements[this.name] = this.text;
          }
        }
        try {
          connection.bind({
            portal: this.portal,
            statement: this.name,
            values: this.values,
            binary: this.binary,
            valueMapper: utils.prepareValue
          });
        } catch (err) {
          connection.close({ type: "S", name: this.name });
          connection.sync();
          this.handleError(err, connection);
          return;
        }
        connection.describe({
          type: "P",
          name: this.portal || ""
        });
        this._getRows(connection, this.rows);
      }
      handleCopyInResponse(connection) {
        connection.sendCopyFail("No source stream defined");
      }
      handleCopyData(msg, connection) {
      }
    };
    module2.exports = Query2;
  }
});

// node_modules/.pnpm/pg-protocol@1.16.1/node_modules/pg-protocol/dist/messages.js
var require_messages = __commonJS({
  "node_modules/.pnpm/pg-protocol@1.16.1/node_modules/pg-protocol/dist/messages.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.NoticeMessage = exports2.DataRowMessage = exports2.CommandCompleteMessage = exports2.ReadyForQueryMessage = exports2.NotificationResponseMessage = exports2.BackendKeyDataMessage = exports2.AuthenticationMD5Password = exports2.ParameterStatusMessage = exports2.ParameterDescriptionMessage = exports2.RowDescriptionMessage = exports2.Field = exports2.CopyResponse = exports2.CopyDataMessage = exports2.DatabaseError = exports2.copyDone = exports2.emptyQuery = exports2.replicationStart = exports2.portalSuspended = exports2.noData = exports2.closeComplete = exports2.bindComplete = exports2.parseComplete = void 0;
    exports2.parseComplete = {
      name: "parseComplete",
      length: 5
    };
    exports2.bindComplete = {
      name: "bindComplete",
      length: 5
    };
    exports2.closeComplete = {
      name: "closeComplete",
      length: 5
    };
    exports2.noData = {
      name: "noData",
      length: 5
    };
    exports2.portalSuspended = {
      name: "portalSuspended",
      length: 5
    };
    exports2.replicationStart = {
      name: "replicationStart",
      length: 4
    };
    exports2.emptyQuery = {
      name: "emptyQuery",
      length: 4
    };
    exports2.copyDone = {
      name: "copyDone",
      length: 4
    };
    var DatabaseError2 = class extends Error {
      constructor(message, length, name) {
        super(message);
        this.length = length;
        this.name = name;
      }
    };
    exports2.DatabaseError = DatabaseError2;
    var CopyDataMessage = class {
      constructor(length, chunk) {
        this.length = length;
        this.chunk = chunk;
        this.name = "copyData";
      }
    };
    exports2.CopyDataMessage = CopyDataMessage;
    var CopyResponse = class {
      constructor(length, name, binary, columnCount) {
        this.length = length;
        this.name = name;
        this.binary = binary;
        this.columnTypes = new Array(columnCount);
      }
    };
    exports2.CopyResponse = CopyResponse;
    var Field = class {
      constructor(name, tableID, columnID, dataTypeID, dataTypeSize, dataTypeModifier, format) {
        this.name = name;
        this.tableID = tableID;
        this.columnID = columnID;
        this.dataTypeID = dataTypeID;
        this.dataTypeSize = dataTypeSize;
        this.dataTypeModifier = dataTypeModifier;
        this.format = format;
      }
    };
    exports2.Field = Field;
    var RowDescriptionMessage = class {
      constructor(length, fieldCount) {
        this.length = length;
        this.fieldCount = fieldCount;
        this.name = "rowDescription";
        this.fields = new Array(this.fieldCount);
      }
    };
    exports2.RowDescriptionMessage = RowDescriptionMessage;
    var ParameterDescriptionMessage = class {
      constructor(length, parameterCount) {
        this.length = length;
        this.parameterCount = parameterCount;
        this.name = "parameterDescription";
        this.dataTypeIDs = new Array(this.parameterCount);
      }
    };
    exports2.ParameterDescriptionMessage = ParameterDescriptionMessage;
    var ParameterStatusMessage = class {
      constructor(length, parameterName, parameterValue) {
        this.length = length;
        this.parameterName = parameterName;
        this.parameterValue = parameterValue;
        this.name = "parameterStatus";
      }
    };
    exports2.ParameterStatusMessage = ParameterStatusMessage;
    var AuthenticationMD5Password = class {
      constructor(length, salt) {
        this.length = length;
        this.salt = salt;
        this.name = "authenticationMD5Password";
      }
    };
    exports2.AuthenticationMD5Password = AuthenticationMD5Password;
    var BackendKeyDataMessage = class {
      constructor(length, processID, secretKey) {
        this.length = length;
        this.processID = processID;
        this.secretKey = secretKey;
        this.name = "backendKeyData";
      }
    };
    exports2.BackendKeyDataMessage = BackendKeyDataMessage;
    var NotificationResponseMessage = class {
      constructor(length, processId, channel, payload) {
        this.length = length;
        this.processId = processId;
        this.channel = channel;
        this.payload = payload;
        this.name = "notification";
      }
    };
    exports2.NotificationResponseMessage = NotificationResponseMessage;
    var ReadyForQueryMessage = class {
      constructor(length, status) {
        this.length = length;
        this.status = status;
        this.name = "readyForQuery";
      }
    };
    exports2.ReadyForQueryMessage = ReadyForQueryMessage;
    var CommandCompleteMessage = class {
      constructor(length, text3) {
        this.length = length;
        this.text = text3;
        this.name = "commandComplete";
      }
    };
    exports2.CommandCompleteMessage = CommandCompleteMessage;
    var DataRowMessage = class {
      constructor(length, fields) {
        this.length = length;
        this.fields = fields;
        this.name = "dataRow";
        this.fieldCount = fields.length;
      }
    };
    exports2.DataRowMessage = DataRowMessage;
    var NoticeMessage = class {
      constructor(length, message) {
        this.length = length;
        this.message = message;
        this.name = "notice";
      }
    };
    exports2.NoticeMessage = NoticeMessage;
  }
});

// node_modules/.pnpm/pg-protocol@1.16.1/node_modules/pg-protocol/dist/buffer-writer.js
var require_buffer_writer = __commonJS({
  "node_modules/.pnpm/pg-protocol@1.16.1/node_modules/pg-protocol/dist/buffer-writer.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Writer = void 0;
    var Writer = class {
      constructor(size = 256) {
        this.size = size;
        this.offset = 5;
        this.headerPosition = 0;
        this.buffer = Buffer.allocUnsafe(size);
      }
      ensure(size) {
        const remaining = this.buffer.length - this.offset;
        if (remaining < size) {
          const oldBuffer = this.buffer;
          const newSize = oldBuffer.length + (oldBuffer.length >> 1) + size;
          this.buffer = Buffer.allocUnsafe(newSize);
          oldBuffer.copy(this.buffer, 0, 0, this.offset);
        }
      }
      addInt32(num) {
        this.ensure(4);
        this.buffer[this.offset++] = num >>> 24 & 255;
        this.buffer[this.offset++] = num >>> 16 & 255;
        this.buffer[this.offset++] = num >>> 8 & 255;
        this.buffer[this.offset++] = num >>> 0 & 255;
        return this;
      }
      addInt16(num) {
        this.ensure(2);
        this.buffer[this.offset++] = num >>> 8 & 255;
        this.buffer[this.offset++] = num >>> 0 & 255;
        return this;
      }
      addCString(string) {
        if (!string) {
          this.ensure(1);
        } else {
          const len = Buffer.byteLength(string);
          this.ensure(len + 1);
          this.buffer.write(string, this.offset, "utf-8");
          this.offset += len;
        }
        this.buffer[this.offset++] = 0;
        return this;
      }
      addString(string = "") {
        const len = Buffer.byteLength(string);
        this.ensure(len);
        this.buffer.write(string, this.offset);
        this.offset += len;
        return this;
      }
      // Write an Int32 byte-length prefix immediately followed by the string's UTF-8
      // bytes. Postgres' Bind wire format prefixes every parameter with its length,
      // and doing it in one method computes Buffer.byteLength ONCE — the previous
      // `addInt32(Buffer.byteLength(s)).addString(s)` pairing scanned the string
      // three times (byteLength for the prefix, byteLength again inside addString,
      // then the encode), which is costly for large text parameters.
      addInt32PrefixedString(string) {
        const len = Buffer.byteLength(string);
        this.ensure(4 + len);
        const buffer = this.buffer;
        let offset = this.offset;
        buffer[offset++] = len >>> 24 & 255;
        buffer[offset++] = len >>> 16 & 255;
        buffer[offset++] = len >>> 8 & 255;
        buffer[offset++] = len >>> 0 & 255;
        buffer.write(string, offset, "utf-8");
        this.offset = offset + len;
        return this;
      }
      add(otherBuffer) {
        this.ensure(otherBuffer.length);
        otherBuffer.copy(this.buffer, this.offset);
        this.offset += otherBuffer.length;
        return this;
      }
      /**
       * Appends an uninitialized block of {@link size} bytes to the buffer and returns its offset.
       */
      reserveUnsafe(size) {
        const offset = this.offset;
        this.ensure(size);
        this.offset += size;
        return offset;
      }
      join(code) {
        if (code) {
          this.buffer[this.headerPosition] = code;
          const length = this.offset - (this.headerPosition + 1);
          this.buffer.writeInt32BE(length, this.headerPosition + 1);
        }
        return this.buffer.slice(code ? 0 : 5, this.offset);
      }
      flush(code) {
        const result = this.join(code);
        this.offset = 5;
        this.headerPosition = 0;
        this.buffer = Buffer.allocUnsafe(this.size);
        return result;
      }
      clear() {
        this.offset = 5;
        this.headerPosition = 0;
      }
    };
    exports2.Writer = Writer;
  }
});

// node_modules/.pnpm/pg-protocol@1.16.1/node_modules/pg-protocol/dist/serializer.js
var require_serializer = __commonJS({
  "node_modules/.pnpm/pg-protocol@1.16.1/node_modules/pg-protocol/dist/serializer.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.serialize = void 0;
    var buffer_writer_1 = require_buffer_writer();
    var writer = new buffer_writer_1.Writer();
    var startup = (opts) => {
      writer.addInt16(3).addInt16(0);
      for (const key of Object.keys(opts)) {
        writer.addCString(key).addCString(opts[key]);
      }
      writer.addCString("client_encoding").addCString("UTF8");
      const bodyBuffer = writer.addCString("").flush();
      const length = bodyBuffer.length + 4;
      return new buffer_writer_1.Writer().addInt32(length).add(bodyBuffer).flush();
    };
    var requestSsl = () => {
      const response = Buffer.allocUnsafe(8);
      response.writeInt32BE(8, 0);
      response.writeInt32BE(80877103, 4);
      return response;
    };
    var password = (password2) => {
      return writer.addCString(password2).flush(
        112
        /* code.startup */
      );
    };
    var sendSASLInitialResponseMessage = function(mechanism, initialResponse) {
      writer.addCString(mechanism).addInt32PrefixedString(initialResponse);
      return writer.flush(
        112
        /* code.startup */
      );
    };
    var sendSCRAMClientFinalMessage = function(additionalData) {
      return writer.addString(additionalData).flush(
        112
        /* code.startup */
      );
    };
    var query = (text3) => {
      return writer.addCString(text3).flush(
        81
        /* code.query */
      );
    };
    var emptyArray = [];
    var parse = (query2) => {
      const name = query2.name || "";
      if (name.length > 63) {
        console.error("Warning! Postgres only supports 63 characters for query names.");
        console.error("You supplied %s (%s)", name, name.length);
        console.error("This can cause conflicts and silent errors executing queries");
      }
      const types2 = query2.types || emptyArray;
      const len = types2.length;
      const buffer = writer.addCString(name).addCString(query2.text).addInt16(len);
      for (let i = 0; i < len; i++) {
        buffer.addInt32(types2[i]);
      }
      return writer.flush(
        80
        /* code.parse */
      );
    };
    var writeValues = function(values, valueMapper, formatsOffset) {
      const len = values.length;
      for (let i = 0; i < len; i++) {
        const mappedVal = valueMapper ? valueMapper(values[i], i) : values[i];
        let formatByte = 0;
        if (mappedVal == null) {
          writer.addInt32(-1);
        } else if (mappedVal instanceof Buffer) {
          formatByte = 1;
          writer.addInt32(mappedVal.length);
          writer.add(mappedVal);
        } else {
          writer.addInt32PrefixedString(mappedVal);
        }
        const buf = writer.buffer;
        buf[formatsOffset++] = 0;
        buf[formatsOffset++] = formatByte;
      }
    };
    var bind = (config = {}) => {
      const portal = config.portal || "";
      const statement = config.statement || "";
      const binary = config.binary || false;
      const values = config.values || emptyArray;
      const len = values.length;
      writer.addCString(portal).addCString(statement);
      writer.addInt16(len);
      const formatsOffset = writer.reserveUnsafe(len * 2);
      writer.addInt16(len);
      try {
        writeValues(values, config.valueMapper, formatsOffset);
      } catch (err) {
        writer.clear();
        throw err;
      }
      writer.addInt16(1);
      writer.addInt16(
        binary ? 1 : 0
        /* ParamType.STRING */
      );
      return writer.flush(
        66
        /* code.bind */
      );
    };
    var emptyExecute = Buffer.from([69, 0, 0, 0, 9, 0, 0, 0, 0, 0]);
    var execute = (config) => {
      if (!config || !config.portal && !config.rows) {
        return emptyExecute;
      }
      const portal = config.portal || "";
      const rows = config.rows || 0;
      const portalLength = Buffer.byteLength(portal);
      const len = 4 + portalLength + 1 + 4;
      const buff = Buffer.allocUnsafe(1 + len);
      buff[0] = 69;
      buff.writeInt32BE(len, 1);
      buff.write(portal, 5, "utf-8");
      buff[portalLength + 5] = 0;
      buff.writeUInt32BE(rows, buff.length - 4);
      return buff;
    };
    var cancel = (processID, secretKey) => {
      const buffer = Buffer.allocUnsafe(16);
      buffer.writeInt32BE(16, 0);
      buffer.writeInt16BE(1234, 4);
      buffer.writeInt16BE(5678, 6);
      buffer.writeInt32BE(processID, 8);
      buffer.writeInt32BE(secretKey, 12);
      return buffer;
    };
    var cstringMessage = (code, string) => {
      const stringLen = Buffer.byteLength(string);
      const len = 4 + stringLen + 1;
      const buffer = Buffer.allocUnsafe(1 + len);
      buffer[0] = code;
      buffer.writeInt32BE(len, 1);
      buffer.write(string, 5, "utf-8");
      buffer[len] = 0;
      return buffer;
    };
    var emptyDescribePortal = writer.addCString("P").flush(
      68
      /* code.describe */
    );
    var emptyDescribeStatement = writer.addCString("S").flush(
      68
      /* code.describe */
    );
    var describe = (msg) => {
      return msg.name ? cstringMessage(68, `${msg.type}${msg.name || ""}`) : msg.type === "P" ? emptyDescribePortal : emptyDescribeStatement;
    };
    var close = (msg) => {
      const text3 = `${msg.type}${msg.name || ""}`;
      return cstringMessage(67, text3);
    };
    var copyData = (chunk) => {
      return writer.add(chunk).flush(
        100
        /* code.copyFromChunk */
      );
    };
    var copyFail = (message) => {
      return cstringMessage(102, message);
    };
    var codeOnlyBuffer = (code) => Buffer.from([code, 0, 0, 0, 4]);
    var flushBuffer = codeOnlyBuffer(
      72
      /* code.flush */
    );
    var syncBuffer = codeOnlyBuffer(
      83
      /* code.sync */
    );
    var endBuffer = codeOnlyBuffer(
      88
      /* code.end */
    );
    var copyDoneBuffer = codeOnlyBuffer(
      99
      /* code.copyDone */
    );
    var serialize = {
      startup,
      password,
      requestSsl,
      sendSASLInitialResponseMessage,
      sendSCRAMClientFinalMessage,
      query,
      parse,
      bind,
      execute,
      describe,
      close,
      flush: () => flushBuffer,
      sync: () => syncBuffer,
      end: () => endBuffer,
      copyData,
      copyDone: () => copyDoneBuffer,
      copyFail,
      cancel
    };
    exports2.serialize = serialize;
  }
});

// node_modules/.pnpm/pg-protocol@1.16.1/node_modules/pg-protocol/dist/buffer-reader.js
var require_buffer_reader = __commonJS({
  "node_modules/.pnpm/pg-protocol@1.16.1/node_modules/pg-protocol/dist/buffer-reader.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.BufferReader = void 0;
    var BufferReader = class {
      constructor(offset = 0) {
        this.offset = offset;
        this.buffer = Buffer.allocUnsafe(0);
        this.encoding = "utf-8";
      }
      setBuffer(offset, buffer) {
        this.offset = offset;
        this.buffer = buffer;
      }
      int16() {
        const result = this.buffer.readInt16BE(this.offset);
        this.offset += 2;
        return result;
      }
      byte() {
        const result = this.buffer[this.offset];
        this.offset++;
        return result;
      }
      int32() {
        const result = this.buffer.readInt32BE(this.offset);
        this.offset += 4;
        return result;
      }
      uint32() {
        const result = this.buffer.readUInt32BE(this.offset);
        this.offset += 4;
        return result;
      }
      string(length) {
        const result = this.buffer.toString(this.encoding, this.offset, this.offset + length);
        this.offset += length;
        return result;
      }
      cstring() {
        const start = this.offset;
        let end = start;
        while (this.buffer[end++]) {
        }
        this.offset = end;
        return this.buffer.toString(this.encoding, start, end - 1);
      }
      bytes(length) {
        const result = this.buffer.slice(this.offset, this.offset + length);
        this.offset += length;
        return result;
      }
    };
    exports2.BufferReader = BufferReader;
  }
});

// node_modules/.pnpm/pg-protocol@1.16.1/node_modules/pg-protocol/dist/parser.js
var require_parser = __commonJS({
  "node_modules/.pnpm/pg-protocol@1.16.1/node_modules/pg-protocol/dist/parser.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Parser = void 0;
    var messages_1 = require_messages();
    var buffer_reader_1 = require_buffer_reader();
    var CODE_LENGTH = 1;
    var LEN_LENGTH = 4;
    var HEADER_LENGTH = CODE_LENGTH + LEN_LENGTH;
    var LATEINIT_LENGTH = -1;
    var emptyBuffer = Buffer.allocUnsafe(0);
    var Parser = class {
      constructor(opts) {
        this.buffer = emptyBuffer;
        this.bufferLength = 0;
        this.bufferOffset = 0;
        this.reader = new buffer_reader_1.BufferReader();
        if ((opts === null || opts === void 0 ? void 0 : opts.mode) === "binary") {
          throw new Error("Binary mode not supported yet");
        }
        this.mode = (opts === null || opts === void 0 ? void 0 : opts.mode) || "text";
      }
      parse(buffer, callback) {
        this.mergeBuffer(buffer);
        const bufferFullLength = this.bufferOffset + this.bufferLength;
        let offset = this.bufferOffset;
        while (offset + HEADER_LENGTH <= bufferFullLength) {
          const code = this.buffer[offset];
          const length = this.buffer.readUInt32BE(offset + CODE_LENGTH);
          const fullMessageLength = CODE_LENGTH + length;
          if (fullMessageLength + offset <= bufferFullLength) {
            const message = this.handlePacket(offset + HEADER_LENGTH, code, length, this.buffer);
            callback(message);
            offset += fullMessageLength;
          } else {
            break;
          }
        }
        if (offset === bufferFullLength) {
          this.buffer = emptyBuffer;
          this.bufferLength = 0;
          this.bufferOffset = 0;
        } else {
          this.bufferLength = bufferFullLength - offset;
          this.bufferOffset = offset;
        }
      }
      mergeBuffer(buffer) {
        if (this.bufferLength > 0) {
          const newLength = this.bufferLength + buffer.byteLength;
          const newFullLength = newLength + this.bufferOffset;
          if (newFullLength > this.buffer.byteLength) {
            let newBuffer;
            if (newLength <= this.buffer.byteLength && this.bufferOffset >= this.bufferLength) {
              newBuffer = this.buffer;
            } else {
              let newBufferLength = this.buffer.byteLength * 2;
              while (newLength >= newBufferLength) {
                newBufferLength *= 2;
              }
              newBuffer = Buffer.allocUnsafe(newBufferLength);
            }
            this.buffer.copy(newBuffer, 0, this.bufferOffset, this.bufferOffset + this.bufferLength);
            this.buffer = newBuffer;
            this.bufferOffset = 0;
          }
          buffer.copy(this.buffer, this.bufferOffset + this.bufferLength);
          this.bufferLength = newLength;
        } else {
          this.buffer = buffer;
          this.bufferOffset = 0;
          this.bufferLength = buffer.byteLength;
        }
      }
      handlePacket(offset, code, length, bytes) {
        const { reader } = this;
        reader.setBuffer(offset, bytes);
        let message;
        switch (code) {
          case 50:
            message = messages_1.bindComplete;
            break;
          case 49:
            message = messages_1.parseComplete;
            break;
          case 51:
            message = messages_1.closeComplete;
            break;
          case 110:
            message = messages_1.noData;
            break;
          case 115:
            message = messages_1.portalSuspended;
            break;
          case 99:
            message = messages_1.copyDone;
            break;
          case 87:
            message = messages_1.replicationStart;
            break;
          case 73:
            message = messages_1.emptyQuery;
            break;
          case 68:
            message = parseDataRowMessage(reader);
            break;
          case 67:
            message = parseCommandCompleteMessage(reader);
            break;
          case 90:
            message = parseReadyForQueryMessage(reader);
            break;
          case 65:
            message = parseNotificationMessage(reader);
            break;
          case 82:
            message = parseAuthenticationResponse(reader, length);
            break;
          case 83:
            message = parseParameterStatusMessage(reader);
            break;
          case 75:
            message = parseBackendKeyData(reader);
            break;
          case 69:
            message = parseErrorMessage(reader, "error");
            break;
          case 78:
            message = parseErrorMessage(reader, "notice");
            break;
          case 84:
            message = parseRowDescriptionMessage(reader);
            break;
          case 116:
            message = parseParameterDescriptionMessage(reader);
            break;
          case 71:
            message = parseCopyInMessage(reader);
            break;
          case 72:
            message = parseCopyOutMessage(reader);
            break;
          case 100:
            message = parseCopyData(reader, length);
            break;
          default:
            return new messages_1.DatabaseError("received invalid response: " + code.toString(16), length, "error");
        }
        reader.setBuffer(0, emptyBuffer);
        message.length = length;
        return message;
      }
    };
    exports2.Parser = Parser;
    var parseReadyForQueryMessage = (reader) => {
      const status = reader.string(1);
      return new messages_1.ReadyForQueryMessage(LATEINIT_LENGTH, status);
    };
    var parseCommandCompleteMessage = (reader) => {
      const text3 = reader.cstring();
      return new messages_1.CommandCompleteMessage(LATEINIT_LENGTH, text3);
    };
    var parseCopyData = (reader, length) => {
      const chunk = reader.bytes(length - 4);
      return new messages_1.CopyDataMessage(LATEINIT_LENGTH, chunk);
    };
    var parseCopyInMessage = (reader) => parseCopyMessage(reader, "copyInResponse");
    var parseCopyOutMessage = (reader) => parseCopyMessage(reader, "copyOutResponse");
    var parseCopyMessage = (reader, messageName) => {
      const isBinary = reader.byte() !== 0;
      const columnCount = reader.int16();
      const message = new messages_1.CopyResponse(LATEINIT_LENGTH, messageName, isBinary, columnCount);
      for (let i = 0; i < columnCount; i++) {
        message.columnTypes[i] = reader.int16();
      }
      return message;
    };
    var parseNotificationMessage = (reader) => {
      const processId = reader.int32();
      const channel = reader.cstring();
      const payload = reader.cstring();
      return new messages_1.NotificationResponseMessage(LATEINIT_LENGTH, processId, channel, payload);
    };
    var parseRowDescriptionMessage = (reader) => {
      const fieldCount = reader.int16();
      const message = new messages_1.RowDescriptionMessage(LATEINIT_LENGTH, fieldCount);
      for (let i = 0; i < fieldCount; i++) {
        message.fields[i] = parseField(reader);
      }
      return message;
    };
    var parseField = (reader) => {
      const name = reader.cstring();
      const tableID = reader.uint32();
      const columnID = reader.int16();
      const dataTypeID = reader.uint32();
      const dataTypeSize = reader.int16();
      const dataTypeModifier = reader.int32();
      const mode = reader.int16() === 0 ? "text" : "binary";
      return new messages_1.Field(name, tableID, columnID, dataTypeID, dataTypeSize, dataTypeModifier, mode);
    };
    var parseParameterDescriptionMessage = (reader) => {
      const parameterCount = reader.int16();
      const message = new messages_1.ParameterDescriptionMessage(LATEINIT_LENGTH, parameterCount);
      for (let i = 0; i < parameterCount; i++) {
        message.dataTypeIDs[i] = reader.uint32();
      }
      return message;
    };
    var parseDataRowMessage = (reader) => {
      const fieldCount = reader.int16();
      const fields = new Array(fieldCount);
      for (let i = 0; i < fieldCount; i++) {
        const len = reader.int32();
        fields[i] = len === -1 ? null : reader.string(len);
      }
      return new messages_1.DataRowMessage(LATEINIT_LENGTH, fields);
    };
    var parseParameterStatusMessage = (reader) => {
      const name = reader.cstring();
      const value = reader.cstring();
      return new messages_1.ParameterStatusMessage(LATEINIT_LENGTH, name, value);
    };
    var parseBackendKeyData = (reader) => {
      const processID = reader.int32();
      const secretKey = reader.int32();
      return new messages_1.BackendKeyDataMessage(LATEINIT_LENGTH, processID, secretKey);
    };
    var parseAuthenticationResponse = (reader, length) => {
      const code = reader.int32();
      const message = {
        name: "authenticationOk",
        length
      };
      switch (code) {
        case 0:
          break;
        case 3:
          if (message.length === 8) {
            message.name = "authenticationCleartextPassword";
          }
          break;
        case 5:
          if (message.length === 12) {
            message.name = "authenticationMD5Password";
            const salt = reader.bytes(4);
            return new messages_1.AuthenticationMD5Password(LATEINIT_LENGTH, salt);
          }
          break;
        case 10:
          {
            message.name = "authenticationSASL";
            message.mechanisms = [];
            let mechanism;
            do {
              mechanism = reader.cstring();
              if (mechanism) {
                message.mechanisms.push(mechanism);
              }
            } while (mechanism);
          }
          break;
        case 11:
          message.name = "authenticationSASLContinue";
          message.data = reader.string(length - 8);
          break;
        case 12:
          message.name = "authenticationSASLFinal";
          message.data = reader.string(length - 8);
          break;
        default:
          throw new Error("Unknown authenticationOk message type " + code);
      }
      return message;
    };
    var parseErrorMessage = (reader, name) => {
      const fields = {};
      let fieldType = reader.string(1);
      while (fieldType !== "\0") {
        fields[fieldType] = reader.cstring();
        fieldType = reader.string(1);
      }
      const messageValue = fields.M;
      const message = name === "notice" ? new messages_1.NoticeMessage(LATEINIT_LENGTH, messageValue) : new messages_1.DatabaseError(messageValue, LATEINIT_LENGTH, name);
      message.severity = fields.S;
      message.code = fields.C;
      message.detail = fields.D;
      message.hint = fields.H;
      message.position = fields.P;
      message.internalPosition = fields.p;
      message.internalQuery = fields.q;
      message.where = fields.W;
      message.schema = fields.s;
      message.table = fields.t;
      message.column = fields.c;
      message.dataType = fields.d;
      message.constraint = fields.n;
      message.file = fields.F;
      message.line = fields.L;
      message.routine = fields.R;
      return message;
    };
  }
});

// node_modules/.pnpm/pg-protocol@1.16.1/node_modules/pg-protocol/dist/index.js
var require_dist2 = __commonJS({
  "node_modules/.pnpm/pg-protocol@1.16.1/node_modules/pg-protocol/dist/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.DatabaseError = exports2.serialize = void 0;
    exports2.parse = parse;
    var messages_1 = require_messages();
    Object.defineProperty(exports2, "DatabaseError", { enumerable: true, get: function() {
      return messages_1.DatabaseError;
    } });
    var serializer_1 = require_serializer();
    Object.defineProperty(exports2, "serialize", { enumerable: true, get: function() {
      return serializer_1.serialize;
    } });
    var parser_1 = require_parser();
    function parse(stream, callback) {
      const parser = new parser_1.Parser();
      stream.on("data", (buffer) => parser.parse(buffer, callback));
      return new Promise((resolve) => stream.on("end", () => resolve()));
    }
  }
});

// node_modules/.pnpm/pg-cloudflare@1.4.1/node_modules/pg-cloudflare/dist/empty.js
var require_empty = __commonJS({
  "node_modules/.pnpm/pg-cloudflare@1.4.1/node_modules/pg-cloudflare/dist/empty.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.default = {};
  }
});

// node_modules/.pnpm/pg@8.23.1/node_modules/pg/lib/stream.js
var require_stream = __commonJS({
  "node_modules/.pnpm/pg@8.23.1/node_modules/pg/lib/stream.js"(exports2, module2) {
    var { getStream, getSecureStream } = getStreamFuncs();
    module2.exports = {
      /**
       * Get a socket stream compatible with the current runtime environment.
       * @returns {Duplex}
       */
      getStream,
      /**
       * Get a TLS secured socket, compatible with the current environment,
       * using the socket and other settings given in `options`.
       * @returns {Duplex}
       */
      getSecureStream
    };
    function getNodejsStreamFuncs() {
      function getStream2(ssl) {
        const net = require("net");
        return new net.Socket();
      }
      function getSecureStream2(options) {
        const tls = require("tls");
        return tls.connect(options);
      }
      return {
        getStream: getStream2,
        getSecureStream: getSecureStream2
      };
    }
    function getCloudflareStreamFuncs() {
      function getStream2(ssl) {
        const { CloudflareSocket } = require_empty();
        return new CloudflareSocket(ssl);
      }
      function getSecureStream2(options) {
        options.socket.startTls(options);
        return options.socket;
      }
      return {
        getStream: getStream2,
        getSecureStream: getSecureStream2
      };
    }
    function isCloudflareRuntime() {
      if (typeof navigator === "object" && navigator !== null && typeof navigator.userAgent === "string") {
        return navigator.userAgent === "Cloudflare-Workers";
      }
      if (typeof Response === "function") {
        const resp = new Response(null, { cf: { thing: true } });
        if (typeof resp.cf === "object" && resp.cf !== null && resp.cf.thing) {
          return true;
        }
      }
      return false;
    }
    function getStreamFuncs() {
      if (isCloudflareRuntime()) {
        return getCloudflareStreamFuncs();
      }
      return getNodejsStreamFuncs();
    }
  }
});

// node_modules/.pnpm/pg@8.23.1/node_modules/pg/lib/connection.js
var require_connection = __commonJS({
  "node_modules/.pnpm/pg@8.23.1/node_modules/pg/lib/connection.js"(exports2, module2) {
    "use strict";
    var EventEmitter = require("events").EventEmitter;
    var { parse, serialize } = require_dist2();
    var stream = require_stream();
    var { getStream } = stream;
    var flushBuffer = serialize.flush();
    var syncBuffer = serialize.sync();
    var endBuffer = serialize.end();
    var Connection2 = class extends EventEmitter {
      constructor(config) {
        super();
        config = config || {};
        this.stream = config.stream || getStream(config.ssl);
        if (typeof this.stream === "function") {
          this.stream = this.stream(config);
        }
        this._keepAlive = config.keepAlive;
        this._keepAliveInitialDelayMillis = config.keepAliveInitialDelayMillis;
        this.parsedStatements = {};
        this.submittedNamedStatements = {};
        this.ssl = config.ssl || false;
        this.sslNegotiation = config.sslNegotiation || "postgres";
        this._ending = false;
        this._emitMessage = false;
        const self = this;
        this.on("newListener", function(eventName) {
          if (eventName === "message") {
            self._emitMessage = true;
          }
        });
      }
      connect(port, host) {
        const self = this;
        this._connecting = true;
        this.stream.setNoDelay(true);
        this.stream.connect(port, host);
        this.stream.once("connect", function() {
          if (self._keepAlive) {
            self.stream.setKeepAlive(true, self._keepAliveInitialDelayMillis);
          }
          self.emit("connect");
        });
        const reportStreamError = function(error) {
          if (self._ending && (error.code === "ECONNRESET" || error.code === "EPIPE")) {
            return;
          }
          self.emit("error", error);
        };
        this.stream.on("error", reportStreamError);
        this.stream.on("close", function() {
          self.emit("end");
        });
        if (!this.ssl) {
          return this.attachListeners(this.stream);
        }
        if (this.sslNegotiation === "direct") {
          return this.stream.once("connect", function() {
            self.upgradeToSSL(host, reportStreamError);
          });
        }
        this.stream.once("data", function(buffer) {
          const responseCode = buffer.toString("utf8");
          switch (responseCode) {
            case "S":
              break;
            case "N":
              self.stream.end();
              return self.emit("error", new Error("The server does not support SSL connections"));
            default:
              self.stream.end();
              return self.emit("error", new Error("There was an error establishing an SSL connection"));
          }
          self.upgradeToSSL(host, reportStreamError);
        });
      }
      upgradeToSSL(host, reportStreamError) {
        const self = this;
        const options = {
          socket: self.stream,
          // tls.connect checks the server identity against `servername`, falling
          // back to `host` and then to 'localhost'. `servername` must stay unset
          // for IP addresses (see below), so `host` is needed to keep certificate
          // validation working when connecting to an IP address.
          host
        };
        if (self.ssl !== true) {
          Object.assign(options, self.ssl);
          if ("key" in self.ssl) {
            options.key = self.ssl.key;
          }
        }
        if (self.sslNegotiation === "direct") {
          options.ALPNProtocols = ["postgresql"];
        }
        const net = require("net");
        if (net.isIP && net.isIP(host) === 0) {
          options.servername = host;
        }
        try {
          self.stream = stream.getSecureStream(options);
        } catch (err) {
          return self.emit("error", err);
        }
        self.attachListeners(self.stream);
        self.stream.on("error", reportStreamError);
        self.emit("sslconnect");
      }
      attachListeners(stream2) {
        parse(stream2, (msg) => {
          const eventName = msg.name === "error" ? "errorMessage" : msg.name;
          if (this._emitMessage) {
            this.emit("message", msg);
          }
          this.emit(eventName, msg);
        });
      }
      requestSsl() {
        this.stream.write(serialize.requestSsl());
      }
      startup(config) {
        this.stream.write(serialize.startup(config));
      }
      cancel(processID, secretKey) {
        this._send(serialize.cancel(processID, secretKey));
      }
      password(password) {
        this._send(serialize.password(password));
      }
      sendSASLInitialResponseMessage(mechanism, initialResponse) {
        this._send(serialize.sendSASLInitialResponseMessage(mechanism, initialResponse));
      }
      sendSCRAMClientFinalMessage(additionalData) {
        this._send(serialize.sendSCRAMClientFinalMessage(additionalData));
      }
      _send(buffer) {
        if (!this.stream.writable) {
          return false;
        }
        return this.stream.write(buffer);
      }
      query(text3) {
        this._send(serialize.query(text3));
      }
      // send parse message
      parse(query) {
        this._send(serialize.parse(query));
      }
      // send bind message
      bind(config) {
        this._send(serialize.bind(config));
      }
      // send execute message
      execute(config) {
        this._send(serialize.execute(config));
      }
      flush() {
        if (this.stream.writable) {
          this.stream.write(flushBuffer);
        }
      }
      sync() {
        this._send(syncBuffer);
      }
      ref() {
        this.stream.ref();
      }
      unref() {
        this.stream.unref();
      }
      end() {
        this._ending = true;
        if (!this._connecting || !this.stream.writable) {
          this.stream.end();
          return;
        }
        return this.stream.write(endBuffer, () => {
          this.stream.end();
        });
      }
      close(msg) {
        this._send(serialize.close(msg));
      }
      describe(msg) {
        this._send(serialize.describe(msg));
      }
      sendCopyFromChunk(chunk) {
        this._send(serialize.copyData(chunk));
      }
      endCopyFrom() {
        this._send(serialize.copyDone());
      }
      sendCopyFail(msg) {
        this._send(serialize.copyFail(msg));
      }
    };
    module2.exports = Connection2;
  }
});

// node_modules/.pnpm/split2@4.2.0/node_modules/split2/index.js
var require_split2 = __commonJS({
  "node_modules/.pnpm/split2@4.2.0/node_modules/split2/index.js"(exports2, module2) {
    "use strict";
    var { Transform } = require("stream");
    var { StringDecoder } = require("string_decoder");
    var kLast = /* @__PURE__ */ Symbol("last");
    var kDecoder = /* @__PURE__ */ Symbol("decoder");
    function transform(chunk, enc, cb) {
      let list;
      if (this.overflow) {
        const buf = this[kDecoder].write(chunk);
        list = buf.split(this.matcher);
        if (list.length === 1) return cb();
        list.shift();
        this.overflow = false;
      } else {
        this[kLast] += this[kDecoder].write(chunk);
        list = this[kLast].split(this.matcher);
      }
      this[kLast] = list.pop();
      for (let i = 0; i < list.length; i++) {
        try {
          push(this, this.mapper(list[i]));
        } catch (error) {
          return cb(error);
        }
      }
      this.overflow = this[kLast].length > this.maxLength;
      if (this.overflow && !this.skipOverflow) {
        cb(new Error("maximum buffer reached"));
        return;
      }
      cb();
    }
    function flush(cb) {
      this[kLast] += this[kDecoder].end();
      if (this[kLast]) {
        try {
          push(this, this.mapper(this[kLast]));
        } catch (error) {
          return cb(error);
        }
      }
      cb();
    }
    function push(self, val) {
      if (val !== void 0) {
        self.push(val);
      }
    }
    function noop(incoming) {
      return incoming;
    }
    function split(matcher, mapper, options) {
      matcher = matcher || /\r?\n/;
      mapper = mapper || noop;
      options = options || {};
      switch (arguments.length) {
        case 1:
          if (typeof matcher === "function") {
            mapper = matcher;
            matcher = /\r?\n/;
          } else if (typeof matcher === "object" && !(matcher instanceof RegExp) && !matcher[Symbol.split]) {
            options = matcher;
            matcher = /\r?\n/;
          }
          break;
        case 2:
          if (typeof matcher === "function") {
            options = mapper;
            mapper = matcher;
            matcher = /\r?\n/;
          } else if (typeof mapper === "object") {
            options = mapper;
            mapper = noop;
          }
      }
      options = Object.assign({}, options);
      options.autoDestroy = true;
      options.transform = transform;
      options.flush = flush;
      options.readableObjectMode = true;
      const stream = new Transform(options);
      stream[kLast] = "";
      stream[kDecoder] = new StringDecoder("utf8");
      stream.matcher = matcher;
      stream.mapper = mapper;
      stream.maxLength = options.maxLength;
      stream.skipOverflow = options.skipOverflow || false;
      stream.overflow = false;
      stream._destroy = function(err, cb) {
        this._writableState.errorEmitted = false;
        cb(err);
      };
      return stream;
    }
    module2.exports = split;
  }
});

// node_modules/.pnpm/pgpass@1.0.5/node_modules/pgpass/lib/helper.js
var require_helper = __commonJS({
  "node_modules/.pnpm/pgpass@1.0.5/node_modules/pgpass/lib/helper.js"(exports2, module2) {
    "use strict";
    var path = require("path");
    var Stream = require("stream").Stream;
    var split = require_split2();
    var util = require("util");
    var defaultPort = 5432;
    var isWin = process.platform === "win32";
    var warnStream = process.stderr;
    var S_IRWXG = 56;
    var S_IRWXO = 7;
    var S_IFMT = 61440;
    var S_IFREG = 32768;
    function isRegFile(mode) {
      return (mode & S_IFMT) == S_IFREG;
    }
    var fieldNames = ["host", "port", "database", "user", "password"];
    var nrOfFields = fieldNames.length;
    var passKey = fieldNames[nrOfFields - 1];
    function warn() {
      var isWritable = warnStream instanceof Stream && true === warnStream.writable;
      if (isWritable) {
        var args = Array.prototype.slice.call(arguments).concat("\n");
        warnStream.write(util.format.apply(util, args));
      }
    }
    Object.defineProperty(module2.exports, "isWin", {
      get: function() {
        return isWin;
      },
      set: function(val) {
        isWin = val;
      }
    });
    module2.exports.warnTo = function(stream) {
      var old = warnStream;
      warnStream = stream;
      return old;
    };
    module2.exports.getFileName = function(rawEnv) {
      var env = rawEnv || process.env;
      var file = env.PGPASSFILE || (isWin ? path.join(env.APPDATA || "./", "postgresql", "pgpass.conf") : path.join(env.HOME || "./", ".pgpass"));
      return file;
    };
    module2.exports.usePgPass = function(stats, fname) {
      if (Object.prototype.hasOwnProperty.call(process.env, "PGPASSWORD")) {
        return false;
      }
      if (isWin) {
        return true;
      }
      fname = fname || "<unkn>";
      if (!isRegFile(stats.mode)) {
        warn('WARNING: password file "%s" is not a plain file', fname);
        return false;
      }
      if (stats.mode & (S_IRWXG | S_IRWXO)) {
        warn('WARNING: password file "%s" has group or world access; permissions should be u=rw (0600) or less', fname);
        return false;
      }
      return true;
    };
    var matcher = module2.exports.match = function(connInfo, entry) {
      return fieldNames.slice(0, -1).reduce(function(prev, field, idx) {
        if (idx == 1) {
          if (Number(connInfo[field] || defaultPort) === Number(entry[field])) {
            return prev && true;
          }
        }
        return prev && (entry[field] === "*" || entry[field] === connInfo[field]);
      }, true);
    };
    module2.exports.getPassword = function(connInfo, stream, cb) {
      var pass;
      var lineStream = stream.pipe(split());
      function onLine(line) {
        var entry = parseLine(line);
        if (entry && isValidEntry(entry) && matcher(connInfo, entry)) {
          pass = entry[passKey];
          lineStream.end();
        }
      }
      var onEnd = function() {
        stream.destroy();
        cb(pass);
      };
      var onErr = function(err) {
        stream.destroy();
        warn("WARNING: error on reading file: %s", err);
        cb(void 0);
      };
      stream.on("error", onErr);
      lineStream.on("data", onLine).on("end", onEnd).on("error", onErr);
    };
    var parseLine = module2.exports.parseLine = function(line) {
      if (line.length < 11 || line.match(/^\s+#/)) {
        return null;
      }
      var curChar = "";
      var prevChar = "";
      var fieldIdx = 0;
      var startIdx = 0;
      var endIdx = 0;
      var obj = {};
      var isLastField = false;
      var addToObj = function(idx, i0, i1) {
        var field = line.substring(i0, i1);
        if (!Object.hasOwnProperty.call(process.env, "PGPASS_NO_DEESCAPE")) {
          field = field.replace(/\\([:\\])/g, "$1");
        }
        obj[fieldNames[idx]] = field;
      };
      for (var i = 0; i < line.length - 1; i += 1) {
        curChar = line.charAt(i + 1);
        prevChar = line.charAt(i);
        isLastField = fieldIdx == nrOfFields - 1;
        if (isLastField) {
          addToObj(fieldIdx, startIdx);
          break;
        }
        if (i >= 0 && curChar == ":" && prevChar !== "\\") {
          addToObj(fieldIdx, startIdx, i + 1);
          startIdx = i + 2;
          fieldIdx += 1;
        }
      }
      obj = Object.keys(obj).length === nrOfFields ? obj : null;
      return obj;
    };
    var isValidEntry = module2.exports.isValidEntry = function(entry) {
      var rules = {
        // host
        0: function(x) {
          return x.length > 0;
        },
        // port
        1: function(x) {
          if (x === "*") {
            return true;
          }
          x = Number(x);
          return isFinite(x) && x > 0 && x < 9007199254740992 && Math.floor(x) === x;
        },
        // database
        2: function(x) {
          return x.length > 0;
        },
        // username
        3: function(x) {
          return x.length > 0;
        },
        // password
        4: function(x) {
          return x.length > 0;
        }
      };
      for (var idx = 0; idx < fieldNames.length; idx += 1) {
        var rule = rules[idx];
        var value = entry[fieldNames[idx]] || "";
        var res = rule(value);
        if (!res) {
          return false;
        }
      }
      return true;
    };
  }
});

// node_modules/.pnpm/pgpass@1.0.5/node_modules/pgpass/lib/index.js
var require_lib = __commonJS({
  "node_modules/.pnpm/pgpass@1.0.5/node_modules/pgpass/lib/index.js"(exports2, module2) {
    "use strict";
    var path = require("path");
    var fs = require("fs");
    var helper = require_helper();
    module2.exports = function(connInfo, cb) {
      var file = helper.getFileName();
      fs.stat(file, function(err, stat) {
        if (err || !helper.usePgPass(stat, file)) {
          return cb(void 0);
        }
        var st = fs.createReadStream(file);
        helper.getPassword(connInfo, st, cb);
      });
    };
    module2.exports.warnTo = helper.warnTo;
  }
});

// node_modules/.pnpm/pg@8.23.1/node_modules/pg/lib/client.js
var require_client = __commonJS({
  "node_modules/.pnpm/pg@8.23.1/node_modules/pg/lib/client.js"(exports2, module2) {
    var EventEmitter = require("events").EventEmitter;
    var utils = require_utils2();
    var nodeUtils = require("util");
    var sasl = require_sasl();
    var TypeOverrides2 = require_type_overrides();
    var ConnectionParameters = require_connection_parameters();
    var Query2 = require_query();
    var defaults2 = require_defaults2();
    var Connection2 = require_connection();
    var crypto = require_utils3();
    var activeQueryDeprecationNotice = nodeUtils.deprecate(
      () => {
      },
      "Client.activeQuery is deprecated and will be removed in pg@9.0"
    );
    var queryQueueDeprecationNotice = nodeUtils.deprecate(
      () => {
      },
      "Client.queryQueue is deprecated and will be removed in pg@9.0."
    );
    var pgPassDeprecationNotice = nodeUtils.deprecate(
      () => {
      },
      "pgpass support is deprecated and will be removed in pg@9.0. You can provide an async function as the password property to the Client/Pool constructor that returns a password instead. Within this function you can call the pgpass module in your own code."
    );
    var byoPromiseDeprecationNotice = nodeUtils.deprecate(
      () => {
      },
      "Passing a custom Promise implementation to the Client/Pool constructor is deprecated and will be removed in pg@9.0."
    );
    var queryQueueLengthDeprecationNotice = nodeUtils.deprecate(
      () => {
      },
      "Calling client.query() when the client is already executing a query is deprecated and will be removed in pg@9.0. Use async/await or an external async flow control mechanism instead."
    );
    function coerceNumberOrDefault(value, defaultValue) {
      if (typeof value === "number") {
        return Number.isFinite(value) ? value : defaultValue;
      }
      if (typeof value === "string" && value.trim() !== "") {
        const n = Number(value);
        return Number.isFinite(n) ? n : defaultValue;
      }
      return defaultValue;
    }
    var Client2 = class extends EventEmitter {
      constructor(config) {
        super();
        this.connectionParameters = new ConnectionParameters(config);
        this.user = this.connectionParameters.user;
        this.database = this.connectionParameters.database;
        this.port = this.connectionParameters.port;
        this.host = this.connectionParameters.host;
        Object.defineProperty(this, "password", {
          configurable: true,
          enumerable: false,
          writable: true,
          value: this.connectionParameters.password
        });
        this.replication = this.connectionParameters.replication;
        const c = config || {};
        if (c.Promise) {
          byoPromiseDeprecationNotice();
        }
        this._Promise = c.Promise || global.Promise;
        this._types = new TypeOverrides2(c.types);
        this._ending = false;
        this._ended = false;
        this._connecting = false;
        this._connected = false;
        this._connectionError = false;
        this._queryable = true;
        this._activeQuery = null;
        this._txStatus = null;
        this.enableChannelBinding = Boolean(c.enableChannelBinding);
        this.scramMaxIterations = coerceNumberOrDefault(c.scramMaxIterations, sasl.DEFAULT_MAX_SCRAM_ITERATIONS);
        this.connection = c.connection || new Connection2({
          stream: c.stream,
          ssl: this.connectionParameters.ssl,
          sslNegotiation: this.connectionParameters.sslnegotiation,
          keepAlive: c.keepAlive || false,
          keepAliveInitialDelayMillis: c.keepAliveInitialDelayMillis || 0,
          encoding: this.connectionParameters.client_encoding || "utf8"
        });
        this._queryQueue = [];
        this._sentQueryQueue = [];
        this.pipeline = Boolean(c.pipeline);
        this.binary = c.binary || defaults2.binary;
        this.processID = null;
        this.secretKey = null;
        this.ssl = this.connectionParameters.ssl || false;
        this.sslNegotiation = this.connectionParameters.sslnegotiation || "postgres";
        if (this.ssl && this.ssl.key) {
          Object.defineProperty(this.ssl, "key", {
            enumerable: false
          });
        }
        this._connectionTimeoutMillis = c.connectionTimeoutMillis || 0;
      }
      get activeQuery() {
        activeQueryDeprecationNotice();
        return this._activeQuery;
      }
      set activeQuery(val) {
        activeQueryDeprecationNotice();
        this._activeQuery = val;
      }
      _getActiveQuery() {
        return this._activeQuery;
      }
      _errorAllQueries(err) {
        const enqueueError = (query) => {
          process.nextTick(() => {
            query.handleError(err, this.connection);
          });
        };
        const activeQuery = this._getActiveQuery();
        if (activeQuery) {
          enqueueError(activeQuery);
          this._activeQuery = null;
        }
        this._sentQueryQueue.forEach(enqueueError);
        this._sentQueryQueue.length = 0;
        this._queryQueue.forEach(enqueueError);
        this._queryQueue.length = 0;
      }
      _connect(callback) {
        const self = this;
        const con = this.connection;
        this._connectionCallback = callback;
        if (this._connecting || this._connected) {
          const err = new Error("Client has already been connected. You cannot reuse a client.");
          process.nextTick(() => {
            callback(err);
          });
          return;
        }
        this._connecting = true;
        if (this._connectionTimeoutMillis > 0) {
          this.connectionTimeoutHandle = setTimeout(() => {
            con._ending = true;
            con.stream.destroy(new Error("timeout expired"));
          }, this._connectionTimeoutMillis);
          if (this.connectionTimeoutHandle.unref) {
            this.connectionTimeoutHandle.unref();
          }
        }
        if (this.host && this.host.indexOf("/") === 0) {
          con.connect(this.host + "/.s.PGSQL." + this.port);
        } else {
          con.connect(this.port, this.host);
        }
        con.on("connect", function() {
          if (self.ssl) {
            if (self.sslNegotiation !== "direct") {
              con.requestSsl();
            }
          } else {
            con.startup(self.getStartupConf());
          }
        });
        con.on("sslconnect", function() {
          con.startup(self.getStartupConf());
        });
        this._attachListeners(con);
        con.once("end", () => {
          const error = this._ending ? new Error("Connection terminated") : new Error("Connection terminated unexpectedly");
          clearTimeout(this.connectionTimeoutHandle);
          this._errorAllQueries(error);
          this._ended = true;
          if (!this._ending) {
            if (this._connecting && !this._connectionError) {
              if (this._connectionCallback) {
                this._connectionCallback(error);
              } else {
                this._handleErrorEvent(error);
              }
            } else if (!this._connectionError) {
              this._handleErrorEvent(error);
            }
          }
          process.nextTick(() => {
            this.emit("end");
          });
        });
      }
      connect(callback) {
        if (callback) {
          this._connect(callback);
          return;
        }
        return new this._Promise((resolve, reject) => {
          this._connect((error) => {
            if (error) {
              reject(error);
            } else {
              resolve(this);
            }
          });
        });
      }
      _attachListeners(con) {
        con.on("authenticationCleartextPassword", this._handleAuthCleartextPassword.bind(this));
        con.on("authenticationMD5Password", this._handleAuthMD5Password.bind(this));
        con.on("authenticationSASL", this._handleAuthSASL.bind(this));
        con.on("authenticationSASLContinue", this._handleAuthSASLContinue.bind(this));
        con.on("authenticationSASLFinal", this._handleAuthSASLFinal.bind(this));
        con.on("backendKeyData", this._handleBackendKeyData.bind(this));
        con.on("error", this._handleErrorEvent.bind(this));
        con.on("errorMessage", this._handleErrorMessage.bind(this));
        con.on("readyForQuery", this._handleReadyForQuery.bind(this));
        con.on("notice", this._handleNotice.bind(this));
        con.on("rowDescription", this._handleRowDescription.bind(this));
        con.on("dataRow", this._handleDataRow.bind(this));
        con.on("portalSuspended", this._handlePortalSuspended.bind(this));
        con.on("emptyQuery", this._handleEmptyQuery.bind(this));
        con.on("commandComplete", this._handleCommandComplete.bind(this));
        con.on("parseComplete", this._handleParseComplete.bind(this));
        con.on("copyInResponse", this._handleCopyInResponse.bind(this));
        con.on("copyData", this._handleCopyData.bind(this));
        con.on("notification", this._handleNotification.bind(this));
      }
      _getPassword(cb) {
        const con = this.connection;
        if (typeof this.password === "function") {
          this._Promise.resolve().then(() => this.password(this.connectionParameters)).then((pass) => {
            if (pass !== void 0) {
              if (typeof pass !== "string") {
                con.emit("error", new TypeError("Password must be a string"));
                return;
              }
              this.connectionParameters.password = this.password = pass;
            } else {
              this.connectionParameters.password = this.password = null;
            }
            cb();
          }).catch((err) => {
            con.emit("error", err);
          });
        } else if (this.password !== null) {
          cb();
        } else {
          try {
            const pgPass = require_lib();
            pgPass(this.connectionParameters, (pass) => {
              if (void 0 !== pass) {
                pgPassDeprecationNotice();
                this.connectionParameters.password = this.password = pass;
              }
              cb();
            });
          } catch (e) {
            this.emit("error", e);
          }
        }
      }
      _handleAuthCleartextPassword(msg) {
        this._getPassword(() => {
          this.connection.password(this.password);
        });
      }
      _handleAuthMD5Password(msg) {
        this._getPassword(async () => {
          try {
            const hashedPassword = await crypto.postgresMd5PasswordHash(this.user, this.password, msg.salt);
            this.connection.password(hashedPassword);
          } catch (e) {
            this.emit("error", e);
          }
        });
      }
      _handleAuthSASL(msg) {
        this._getPassword(() => {
          try {
            this.saslSession = sasl.startSession(
              msg.mechanisms,
              this.enableChannelBinding && this.connection.stream,
              this.scramMaxIterations
            );
            this.connection.sendSASLInitialResponseMessage(this.saslSession.mechanism, this.saslSession.response);
          } catch (err) {
            this.connection.emit("error", err);
          }
        });
      }
      async _handleAuthSASLContinue(msg) {
        try {
          await sasl.continueSession(
            this.saslSession,
            this.password,
            msg.data,
            this.enableChannelBinding && this.connection.stream
          );
          this.connection.sendSCRAMClientFinalMessage(this.saslSession.response);
        } catch (err) {
          this.connection.emit("error", err);
        }
      }
      _handleAuthSASLFinal(msg) {
        try {
          sasl.finalizeSession(this.saslSession, msg.data);
          this.saslSession = null;
        } catch (err) {
          this.connection.emit("error", err);
        }
      }
      _handleBackendKeyData(msg) {
        this.processID = msg.processID;
        this.secretKey = msg.secretKey;
      }
      _handleReadyForQuery(msg) {
        if (this._connecting) {
          this._connecting = false;
          this._connected = true;
          clearTimeout(this.connectionTimeoutHandle);
          if (this._connectionCallback) {
            this._connectionCallback(null, this);
            this._connectionCallback = null;
          }
          this.emit("connect");
        }
        const activeQuery = this._getActiveQuery();
        this._activeQuery = null;
        this._txStatus = msg?.status ?? null;
        this.readyForQuery = true;
        if (activeQuery) {
          activeQuery.handleReadyForQuery(this.connection);
        }
        this._pulseQueryQueue();
      }
      // if we receive an error event or error message
      // during the connection process we handle it here
      _handleErrorWhileConnecting(err) {
        if (this._connectionError) {
          return;
        }
        this._connectionError = true;
        clearTimeout(this.connectionTimeoutHandle);
        if (this._connectionCallback) {
          return this._connectionCallback(err);
        }
        this.emit("error", err);
      }
      // if we're connected and we receive an error event from the connection
      // this means the socket is dead - do a hard abort of all queries and emit
      // the socket error on the client as well
      _handleErrorEvent(err) {
        if (this._connecting) {
          return this._handleErrorWhileConnecting(err);
        }
        this._queryable = false;
        this._errorAllQueries(err);
        this.emit("error", err);
      }
      // handle error messages from the postgres backend
      _handleErrorMessage(msg) {
        if (this._connecting) {
          return this._handleErrorWhileConnecting(msg);
        }
        const activeQuery = this._getActiveQuery();
        if (!activeQuery) {
          this._handleErrorEvent(msg);
          return;
        }
        this._activeQuery = null;
        if (activeQuery.name) {
          delete this.connection.submittedNamedStatements[activeQuery.name];
        }
        activeQuery.handleError(msg, this.connection);
      }
      _handleRowDescription(msg) {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected rowDescription message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        activeQuery.handleRowDescription(msg);
      }
      _handleDataRow(msg) {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected dataRow message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        activeQuery.handleDataRow(msg);
      }
      _handlePortalSuspended(msg) {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected portalSuspended message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        activeQuery.handlePortalSuspended(this.connection);
      }
      _handleEmptyQuery(msg) {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected emptyQuery message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        activeQuery.handleEmptyQuery(this.connection);
      }
      _handleCommandComplete(msg) {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected commandComplete message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        activeQuery.handleCommandComplete(msg, this.connection);
      }
      _handleParseComplete() {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected parseComplete message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        if (activeQuery.name) {
          this.connection.parsedStatements[activeQuery.name] = activeQuery.text;
          delete this.connection.submittedNamedStatements[activeQuery.name];
        }
      }
      _handleCopyInResponse(msg) {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected copyInResponse message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        activeQuery.handleCopyInResponse(this.connection);
      }
      _handleCopyData(msg) {
        const activeQuery = this._getActiveQuery();
        if (activeQuery == null) {
          const error = new Error("Received unexpected copyData message from backend.");
          this._handleErrorEvent(error);
          return;
        }
        activeQuery.handleCopyData(msg, this.connection);
      }
      _handleNotification(msg) {
        this.emit("notification", msg);
      }
      _handleNotice(msg) {
        this.emit("notice", msg);
      }
      getStartupConf() {
        const params = this.connectionParameters;
        const data = {
          user: params.user,
          database: params.database
        };
        const appName = params.application_name || params.fallback_application_name;
        if (appName) {
          data.application_name = appName;
        }
        if (params.replication) {
          data.replication = "" + params.replication;
        }
        if (params.statement_timeout) {
          data.statement_timeout = String(parseInt(params.statement_timeout, 10));
        }
        if (params.lock_timeout) {
          data.lock_timeout = String(parseInt(params.lock_timeout, 10));
        }
        if (params.idle_in_transaction_session_timeout) {
          data.idle_in_transaction_session_timeout = String(parseInt(params.idle_in_transaction_session_timeout, 10));
        }
        if (params.options) {
          data.options = params.options;
        }
        return data;
      }
      cancel(client, query) {
        if (client.activeQuery === query) {
          const con = this.connection;
          if (this.host && this.host.indexOf("/") === 0) {
            con.connect(this.host + "/.s.PGSQL." + this.port);
          } else {
            con.connect(this.port, this.host);
          }
          con.on("connect", function() {
            con.cancel(client.processID, client.secretKey);
          });
        } else if (client._queryQueue.indexOf(query) !== -1) {
          client._queryQueue.splice(client._queryQueue.indexOf(query), 1);
        } else if (client._sentQueryQueue.indexOf(query) !== -1) {
          query.callback = () => {
          };
        }
      }
      setTypeParser(oid, format, parseFn) {
        return this._types.setTypeParser(oid, format, parseFn);
      }
      getTypeParser(oid, format) {
        return this._types.getTypeParser(oid, format);
      }
      // escapeIdentifier and escapeLiteral moved to utility functions & exported
      // on PG
      // re-exported here for backwards compatibility
      escapeIdentifier(str) {
        return utils.escapeIdentifier(str);
      }
      escapeLiteral(str) {
        return utils.escapeLiteral(str);
      }
      _pulseQueryQueue() {
        if (this.pipeline) {
          this._pulsePipelinedQueryQueue();
          return;
        }
        if (this.readyForQuery === true) {
          this._activeQuery = this._queryQueue.shift();
          const activeQuery = this._getActiveQuery();
          if (activeQuery) {
            this.readyForQuery = false;
            this.hasExecuted = true;
            const queryError = activeQuery.submit(this.connection);
            if (queryError) {
              process.nextTick(() => {
                activeQuery.handleError(queryError, this.connection);
                this.readyForQuery = true;
                this._pulseQueryQueue();
              });
            }
          } else if (this.hasExecuted) {
            this._activeQuery = null;
            this.emit("drain");
          }
        }
      }
      _pulsePipelinedQueryQueue() {
        if (!this._connected || !this._queryable) {
          return;
        }
        while (this._queryQueue.length > 0) {
          const query = this._queryQueue.shift();
          this.hasExecuted = true;
          const queryError = query.submit(this.connection);
          if (queryError) {
            process.nextTick(() => {
              query.handleError(queryError, this.connection);
            });
            continue;
          }
          this._sentQueryQueue.push(query);
        }
        if (this.readyForQuery && !this._activeQuery && this._sentQueryQueue.length > 0) {
          this._activeQuery = this._sentQueryQueue.shift();
          this.readyForQuery = false;
        }
        if (!this._activeQuery && this._sentQueryQueue.length === 0 && this._queryQueue.length === 0 && this.hasExecuted) {
          this.emit("drain");
        }
      }
      query(config, values, callback) {
        let query;
        let result;
        if (config == null) {
          throw new TypeError("Client was passed a null or undefined query");
        }
        if (typeof config.submit === "function") {
          result = query = config;
          if (!query.callback) {
            if (typeof values === "function") {
              query.callback = values;
            } else if (callback) {
              query.callback = callback;
            }
          }
        } else {
          query = new Query2(config, values, callback);
          if (!query.callback) {
            result = new this._Promise((resolve, reject) => {
              query.callback = (err, res) => err ? reject(err) : resolve(res);
            }).catch((err) => {
              Error.captureStackTrace(err);
              throw err;
            });
          } else if (typeof query.callback !== "function") {
            throw new TypeError("callback is not a function");
          }
        }
        const readTimeout = config.query_timeout || this.connectionParameters.query_timeout;
        if (readTimeout) {
          const queryCallback = query.callback || (() => {
          });
          const readTimeoutTimer = setTimeout(() => {
            const error = new Error("Query read timeout");
            process.nextTick(() => {
              query.handleError(error, this.connection);
            });
            queryCallback(error);
            query.callback = () => {
            };
            const index = this._queryQueue.indexOf(query);
            if (index > -1) {
              this._queryQueue.splice(index, 1);
            } else if (this.pipeline) {
              this.connection.stream.destroy();
              return;
            }
            this._pulseQueryQueue();
          }, readTimeout);
          query.callback = (err, res) => {
            clearTimeout(readTimeoutTimer);
            queryCallback(err, res);
          };
        }
        if (this.binary && !query.binary) {
          query.binary = true;
        }
        if (query._result && !query._result._types) {
          query._result._types = this._types;
        }
        if (this.pipeline) {
          const portalQuery = typeof config.submit === "function" && !(query instanceof Query2) ? "Custom query classes such as pg-cursor and pg-query-stream are" : query.rows ? "The `rows` option is" : null;
          if (portalQuery) {
            process.nextTick(() => {
              query.handleError(new Error(`${portalQuery} not supported in pipeline mode`), this.connection);
            });
            return result;
          }
        }
        if (!this._queryable) {
          process.nextTick(() => {
            query.handleError(new Error("Client has encountered a connection error and is not queryable"), this.connection);
          });
          return result;
        }
        if (this._ending) {
          process.nextTick(() => {
            query.handleError(new Error("Client was closed and is not queryable"), this.connection);
          });
          return result;
        }
        if (this._queryQueue.length > 0 && !this.pipeline) {
          queryQueueLengthDeprecationNotice();
        }
        this._queryQueue.push(query);
        this._pulseQueryQueue();
        return result;
      }
      ref() {
        this.connection.ref();
      }
      unref() {
        this.connection.unref();
      }
      getTransactionStatus() {
        return this._txStatus;
      }
      end(cb) {
        this._ending = true;
        if (!this.connection._connecting || this._ended) {
          if (cb) {
            cb();
            return;
          } else {
            return this._Promise.resolve();
          }
        }
        if (!this._queryable) {
          this.connection.stream.destroy();
        } else if (this.pipeline && (this._getActiveQuery() || this._sentQueryQueue.length > 0 || this._queryQueue.length > 0)) {
          this.once("drain", () => this.connection.end());
        } else if (this._getActiveQuery()) {
          this.connection.stream.destroy();
        } else {
          this.connection.end();
        }
        if (cb) {
          this.connection.once("end", cb);
        } else {
          return new this._Promise((resolve) => {
            this.connection.once("end", resolve);
          });
        }
      }
      get queryQueue() {
        queryQueueDeprecationNotice();
        return this._queryQueue;
      }
    };
    Client2.Query = Query2;
    module2.exports = Client2;
  }
});

// node_modules/.pnpm/pg-pool@3.14.0_pg@8.23.1/node_modules/pg-pool/index.js
var require_pg_pool = __commonJS({
  "node_modules/.pnpm/pg-pool@3.14.0_pg@8.23.1/node_modules/pg-pool/index.js"(exports2, module2) {
    "use strict";
    var EventEmitter = require("events").EventEmitter;
    var NOOP = function() {
    };
    var removeWhere = (list, predicate) => {
      const i = list.findIndex(predicate);
      return i === -1 ? void 0 : list.splice(i, 1)[0];
    };
    var IdleItem = class {
      constructor(client, idleListener, timeoutId) {
        this.client = client;
        this.idleListener = idleListener;
        this.timeoutId = timeoutId;
      }
    };
    var PendingItem = class {
      constructor(callback) {
        this.callback = callback;
      }
    };
    function throwOnDoubleRelease() {
      throw new Error("Release called on client which has already been released to the pool.");
    }
    function promisify(Promise2, callback) {
      if (callback) {
        return { callback, result: void 0 };
      }
      let rej;
      let res;
      const cb = function(err, client) {
        err ? rej(err) : res(client);
      };
      const result = new Promise2(function(resolve, reject) {
        res = resolve;
        rej = reject;
      }).catch((err) => {
        Error.captureStackTrace(err);
        throw err;
      });
      return { callback: cb, result };
    }
    function makeIdleListener(pool, client) {
      return function idleListener(err) {
        err.client = client;
        client.removeListener("error", idleListener);
        client.on("error", () => {
          pool.log("additional client error after disconnection due to error", err);
        });
        pool._remove(client);
        pool.emit("error", err, client);
      };
    }
    var Pool2 = class extends EventEmitter {
      constructor(options, Client2) {
        super();
        this.options = Object.assign({}, options);
        if (options != null && "password" in options) {
          Object.defineProperty(this.options, "password", {
            configurable: true,
            enumerable: false,
            writable: true,
            value: options.password
          });
        }
        if (options != null && options.ssl && options.ssl.key) {
          Object.defineProperty(this.options.ssl, "key", {
            enumerable: false
          });
        }
        this.options.max = this.options.max || this.options.poolSize || 10;
        this.options.min = this.options.min || 0;
        this.options.maxUses = this.options.maxUses || Infinity;
        this.options.allowExitOnIdle = this.options.allowExitOnIdle || false;
        this.options.maxLifetimeSeconds = this.options.maxLifetimeSeconds || 0;
        this.log = this.options.log || function() {
        };
        this.Client = this.options.Client || Client2 || require_lib2().Client;
        this.Promise = this.options.Promise || global.Promise;
        if (typeof this.options.idleTimeoutMillis === "undefined") {
          this.options.idleTimeoutMillis = 1e4;
        }
        this._clients = [];
        this._idle = [];
        this._expired = /* @__PURE__ */ new WeakSet();
        this._pendingQueue = [];
        this._endCallback = void 0;
        this.ending = false;
        this.ended = false;
      }
      _promiseTry(f) {
        const Promise2 = this.Promise;
        if (typeof Promise2.try === "function") {
          return Promise2.try(f);
        }
        return new Promise2((resolve) => resolve(f()));
      }
      _isFull() {
        return this._clients.length >= this.options.max;
      }
      _isAboveMin() {
        return this._clients.length > this.options.min;
      }
      _pulseQueue() {
        this.log("pulse queue");
        if (this.ended) {
          this.log("pulse queue ended");
          return;
        }
        if (this.ending) {
          this.log("pulse queue on ending");
          if (this._idle.length) {
            this._idle.slice().map((item) => {
              this._remove(item.client);
            });
          }
          if (!this._clients.length) {
            this.ended = true;
            this._endCallback();
          }
          return;
        }
        if (!this._pendingQueue.length) {
          this.log("no queued requests");
          return;
        }
        if (!this._idle.length && this._isFull()) {
          return;
        }
        const pendingItem = this._pendingQueue.shift();
        if (this._idle.length) {
          const idleItem = this._idle.pop();
          clearTimeout(idleItem.timeoutId);
          const client = idleItem.client;
          client.ref && client.ref();
          const idleListener = idleItem.idleListener;
          return this._acquireClient(client, pendingItem, idleListener, false);
        }
        if (!this._isFull()) {
          return this.newClient(pendingItem);
        }
        throw new Error("unexpected condition");
      }
      _remove(client, callback) {
        const removed = removeWhere(this._idle, (item) => item.client === client);
        if (removed !== void 0) {
          clearTimeout(removed.timeoutId);
        }
        this._clients = this._clients.filter((c) => c !== client);
        const context = this;
        client.end(() => {
          context.emit("remove", client);
          if (typeof callback === "function") {
            callback();
          }
        });
      }
      connect(cb) {
        if (this.ending) {
          const err = new Error("Cannot use a pool after calling end on the pool");
          return cb ? cb(err) : this.Promise.reject(err);
        }
        const response = promisify(this.Promise, cb);
        const result = response.result;
        if (this._isFull() || this._idle.length) {
          if (this._idle.length) {
            process.nextTick(() => this._pulseQueue());
          }
          if (!this.options.connectionTimeoutMillis) {
            this._pendingQueue.push(new PendingItem(response.callback));
            return result;
          }
          const queueCallback = (err, res, done) => {
            clearTimeout(tid);
            response.callback(err, res, done);
          };
          const pendingItem = new PendingItem(queueCallback);
          const tid = setTimeout(() => {
            removeWhere(this._pendingQueue, (i) => i.callback === queueCallback);
            pendingItem.timedOut = true;
            response.callback(new Error("timeout exceeded when trying to connect"));
          }, this.options.connectionTimeoutMillis);
          if (tid.unref) {
            tid.unref();
          }
          this._pendingQueue.push(pendingItem);
          return result;
        }
        this.newClient(new PendingItem(response.callback));
        return result;
      }
      newClient(pendingItem) {
        const client = new this.Client(this.options);
        this._clients.push(client);
        const idleListener = makeIdleListener(this, client);
        this.log("checking client timeout");
        let tid;
        let timeoutHit = false;
        if (this.options.connectionTimeoutMillis) {
          tid = setTimeout(() => {
            if (client.connection) {
              this.log("ending client due to timeout");
              timeoutHit = true;
              client.connection.stream.destroy();
            } else if (!client.isConnected()) {
              this.log("ending client due to timeout");
              timeoutHit = true;
              client.end();
            }
          }, this.options.connectionTimeoutMillis);
        }
        this.log("connecting new client");
        client.connect((err) => {
          if (tid) {
            clearTimeout(tid);
          }
          client.on("error", idleListener);
          if (err) {
            this.log("client failed to connect", err);
            this._clients = this._clients.filter((c) => c !== client);
            if (timeoutHit) {
              err = new Error("Connection terminated due to connection timeout", { cause: err });
            }
            this._pulseQueue();
            if (!pendingItem.timedOut) {
              pendingItem.callback(err, void 0, NOOP);
            }
          } else {
            this.log("new client connected");
            if (this.options.onConnect) {
              this._promiseTry(() => this.options.onConnect(client)).then(
                () => {
                  this._afterConnect(client, pendingItem, idleListener);
                },
                (hookErr) => {
                  this._clients = this._clients.filter((c) => c !== client);
                  client.end(() => {
                    this._pulseQueue();
                    if (!pendingItem.timedOut) {
                      pendingItem.callback(hookErr, void 0, NOOP);
                    }
                  });
                }
              );
              return;
            }
            return this._afterConnect(client, pendingItem, idleListener);
          }
        });
      }
      _afterConnect(client, pendingItem, idleListener) {
        if (this.options.maxLifetimeSeconds !== 0) {
          const maxLifetimeTimeout = setTimeout(() => {
            this.log("ending client due to expired lifetime");
            this._expired.add(client);
            const idleIndex = this._idle.findIndex((idleItem) => idleItem.client === client);
            if (idleIndex !== -1) {
              this._acquireClient(
                client,
                new PendingItem((err, client2, clientRelease) => clientRelease()),
                idleListener,
                false
              );
            }
          }, this.options.maxLifetimeSeconds * 1e3);
          maxLifetimeTimeout.unref();
          client.once("end", () => clearTimeout(maxLifetimeTimeout));
        }
        return this._acquireClient(client, pendingItem, idleListener, true);
      }
      // acquire a client for a pending work item
      _acquireClient(client, pendingItem, idleListener, isNew) {
        if (isNew) {
          this.emit("connect", client);
        }
        this.emit("acquire", client);
        client.release = this._releaseOnce(client, idleListener);
        client.removeListener("error", idleListener);
        if (!pendingItem.timedOut) {
          if (isNew && this.options.verify) {
            this.options.verify(client, (err) => {
              if (err) {
                client.release(err);
                return pendingItem.callback(err, void 0, NOOP);
              }
              pendingItem.callback(void 0, client, client.release);
            });
          } else {
            pendingItem.callback(void 0, client, client.release);
          }
        } else {
          if (isNew && this.options.verify) {
            this.options.verify(client, client.release);
          } else {
            client.release();
          }
        }
      }
      // returns a function that wraps _release and throws if called more than once
      _releaseOnce(client, idleListener) {
        let released = false;
        return (err) => {
          if (released) {
            throwOnDoubleRelease();
          }
          released = true;
          this._release(client, idleListener, err);
        };
      }
      // release a client back to the poll, include an error
      // to remove it from the pool
      _release(client, idleListener, err) {
        client.on("error", idleListener);
        client._poolUseCount = (client._poolUseCount || 0) + 1;
        this.emit("release", err, client);
        if (err || this.ending || !client._queryable || client._ending || client._poolUseCount >= this.options.maxUses) {
          if (client._poolUseCount >= this.options.maxUses) {
            this.log("remove expended client");
          }
          return this._remove(client, this._pulseQueue.bind(this));
        }
        const isExpired = this._expired.has(client);
        if (isExpired) {
          this.log("remove expired client");
          this._expired.delete(client);
          return this._remove(client, this._pulseQueue.bind(this));
        }
        let tid;
        if (this.options.idleTimeoutMillis && this._isAboveMin()) {
          tid = setTimeout(() => {
            if (this._isAboveMin()) {
              this.log("remove idle client");
              this._remove(client, this._pulseQueue.bind(this));
            }
          }, this.options.idleTimeoutMillis);
          if (this.options.allowExitOnIdle) {
            tid.unref();
          }
        }
        if (this.options.allowExitOnIdle) {
          client.unref();
        }
        this._idle.push(new IdleItem(client, idleListener, tid));
        this._pulseQueue();
      }
      query(text3, values, cb) {
        if (typeof text3 === "function") {
          const response2 = promisify(this.Promise, text3);
          setImmediate(function() {
            return response2.callback(new Error("Passing a function as the first parameter to pool.query is not supported"));
          });
          return response2.result;
        }
        if (typeof values === "function") {
          cb = values;
          values = void 0;
        }
        const response = promisify(this.Promise, cb);
        cb = response.callback;
        this.connect((err, client) => {
          if (err) {
            return cb(err);
          }
          let clientReleased = false;
          const onError = (err2) => {
            if (clientReleased) {
              return;
            }
            clientReleased = true;
            client.release(err2);
            cb(err2);
          };
          client.once("error", onError);
          this.log("dispatching query");
          try {
            client.query(text3, values, (err2, res) => {
              this.log("query dispatched");
              client.removeListener("error", onError);
              if (clientReleased) {
                return;
              }
              clientReleased = true;
              client.release(err2);
              if (err2) {
                return cb(err2);
              }
              return cb(void 0, res);
            });
          } catch (err2) {
            client.release(err2);
            return cb(err2);
          }
        });
        return response.result;
      }
      end(cb) {
        this.log("ending");
        if (this.ending) {
          const err = new Error("Called end on pool more than once");
          return cb ? cb(err) : this.Promise.reject(err);
        }
        this.ending = true;
        const promised = promisify(this.Promise, cb);
        this._endCallback = promised.callback;
        this._pulseQueue();
        return promised.result;
      }
      get waitingCount() {
        return this._pendingQueue.length;
      }
      get idleCount() {
        return this._idle.length;
      }
      get expiredCount() {
        return this._clients.reduce((acc, client) => acc + (this._expired.has(client) ? 1 : 0), 0);
      }
      get totalCount() {
        return this._clients.length;
      }
    };
    module2.exports = Pool2;
  }
});

// node_modules/.pnpm/pg@8.23.1/node_modules/pg/lib/native/query.js
var require_query2 = __commonJS({
  "node_modules/.pnpm/pg@8.23.1/node_modules/pg/lib/native/query.js"(exports2, module2) {
    "use strict";
    var EventEmitter = require("events").EventEmitter;
    var util = require("util");
    var utils = require_utils2();
    var NativeQuery = module2.exports = function(config, values, callback) {
      EventEmitter.call(this);
      config = utils.normalizeQueryConfig(config, values, callback);
      this.text = config.text;
      this.values = config.values;
      this.name = config.name;
      this.queryMode = config.queryMode;
      this.callback = config.callback;
      this.state = "new";
      this._arrayMode = config.rowMode === "array";
      this._emitRowEvents = false;
      this.on(
        "newListener",
        function(event) {
          if (event === "row") this._emitRowEvents = true;
        }.bind(this)
      );
    };
    util.inherits(NativeQuery, EventEmitter);
    var errorFieldMap = {
      sqlState: "code",
      statementPosition: "position",
      messagePrimary: "message",
      messageDetail: "detail",
      messageHint: "hint",
      context: "where",
      schemaName: "schema",
      tableName: "table",
      columnName: "column",
      dataTypeName: "dataType",
      constraintName: "constraint",
      sourceFile: "file",
      sourceLine: "line",
      sourceFunction: "routine"
    };
    NativeQuery.prototype.handleError = function(err) {
      const fields = this.native && this.native.pq.resultErrorFields();
      if (fields) {
        for (const key in fields) {
          const normalizedFieldName = errorFieldMap[key] || key;
          err[normalizedFieldName] = fields[key];
        }
      }
      if (this.callback) {
        this.callback(err);
      } else {
        this.emit("error", err);
      }
      this.state = "error";
    };
    NativeQuery.prototype.then = function(onSuccess, onFailure) {
      return this._getPromise().then(onSuccess, onFailure);
    };
    NativeQuery.prototype.catch = function(callback) {
      return this._getPromise().catch(callback);
    };
    NativeQuery.prototype._getPromise = function() {
      if (this._promise) return this._promise;
      this._promise = new Promise(
        function(resolve, reject) {
          this._once("end", resolve);
          this._once("error", reject);
        }.bind(this)
      );
      return this._promise;
    };
    NativeQuery.prototype.submit = function(client) {
      this.state = "running";
      const self = this;
      this.native = client.native;
      client.native.arrayMode = this._arrayMode;
      let after = function(err, rows, results) {
        client.native.arrayMode = false;
        setImmediate(function() {
          self.emit("_done");
        });
        if (err) {
          return self.handleError(err);
        }
        if (self._emitRowEvents) {
          if (results.length > 1) {
            rows.forEach((rowOfRows, i) => {
              rowOfRows.forEach((row) => {
                self.emit("row", row, results[i]);
              });
            });
          } else {
            rows.forEach(function(row) {
              self.emit("row", row, results);
            });
          }
        }
        self.state = "end";
        self.emit("end", results);
        if (self.callback) {
          self.callback(null, results);
        }
      };
      if (process.domain) {
        after = process.domain.bind(after);
      }
      if (this.name) {
        if (this.name.length > 63) {
          console.error("Warning! Postgres only supports 63 characters for query names.");
          console.error("You supplied %s (%s)", this.name, this.name.length);
          console.error("This can cause conflicts and silent errors executing queries");
        }
        const values = (this.values || []).map(utils.prepareValue);
        if (client.namedQueries[this.name] !== void 0) {
          if (this.text && client.namedQueries[this.name] !== this.text) {
            const err = new Error(`Prepared statements must be unique - '${this.name}' was used for a different statement`);
            return after(err);
          }
          return client.native.execute(this.name, values, after);
        }
        return client.native.prepare(this.name, this.text, values.length, function(err) {
          if (err) return after(err);
          client.namedQueries[self.name] = self.text;
          return self.native.execute(self.name, values, after);
        });
      } else if (this.values) {
        if (!Array.isArray(this.values)) {
          const err = new Error("Query values must be an array");
          return after(err);
        }
        const vals = this.values.map(utils.prepareValue);
        client.native.query(this.text, vals, after);
      } else if (this.queryMode === "extended") {
        client.native.query(this.text, [], after);
      } else {
        client.native.query(this.text, after);
      }
    };
  }
});

// node_modules/.pnpm/pg@8.23.1/node_modules/pg/lib/native/client.js
var require_client2 = __commonJS({
  "node_modules/.pnpm/pg@8.23.1/node_modules/pg/lib/native/client.js"(exports2, module2) {
    var nodeUtils = require("util");
    var Native;
    try {
      Native = require("pg-native");
    } catch (e) {
      throw e;
    }
    var TypeOverrides2 = require_type_overrides();
    var EventEmitter = require("events").EventEmitter;
    var util = require("util");
    var ConnectionParameters = require_connection_parameters();
    var NativeQuery = require_query2();
    var queryQueueLengthDeprecationNotice = nodeUtils.deprecate(
      () => {
      },
      "Calling client.query() when the client is already executing a query is deprecated and will be removed in pg@9.0. Use async/await or an external async flow control mechanism instead."
    );
    var Client2 = module2.exports = function(config) {
      EventEmitter.call(this);
      config = config || {};
      this._Promise = config.Promise || global.Promise;
      this._types = new TypeOverrides2(config.types);
      this.native = new Native({
        types: this._types
      });
      this._queryQueue = [];
      this._ending = false;
      this._connecting = false;
      this._connected = false;
      this._queryable = true;
      this.pipeline = Boolean(config.pipeline);
      this._pipelineInFlight = false;
      const cp = this.connectionParameters = new ConnectionParameters(config);
      if (config.nativeConnectionString) cp.nativeConnectionString = config.nativeConnectionString;
      this.user = cp.user;
      Object.defineProperty(this, "password", {
        configurable: true,
        enumerable: false,
        writable: true,
        value: cp.password
      });
      this.database = cp.database;
      this.host = cp.host;
      this.port = cp.port;
      this.namedQueries = {};
    };
    Client2.Query = NativeQuery;
    util.inherits(Client2, EventEmitter);
    Client2.prototype._errorAllQueries = function(err) {
      const enqueueError = (query) => {
        process.nextTick(() => {
          query.native = this.native;
          query.handleError(err);
        });
      };
      if (this._hasActiveQuery()) {
        enqueueError(this._activeQuery);
        this._activeQuery = null;
      }
      this._queryQueue.forEach(enqueueError);
      this._queryQueue.length = 0;
    };
    Client2.prototype._connect = function(cb) {
      const self = this;
      if (this._connecting) {
        process.nextTick(() => cb(new Error("Client has already been connected. You cannot reuse a client.")));
        return;
      }
      this._connecting = true;
      this.connectionParameters.getLibpqConnectionString(function(err, conString) {
        if (self.connectionParameters.nativeConnectionString) conString = self.connectionParameters.nativeConnectionString;
        if (err) return cb(err);
        self.native.connect(conString, function(err2) {
          if (err2) {
            self.native.end();
            return cb(err2);
          }
          self._connected = true;
          self.native.on("error", function(err3) {
            self._queryable = false;
            self._errorAllQueries(err3);
            self.emit("error", err3);
          });
          self.native.on("notification", function(msg) {
            self.emit("notification", {
              channel: msg.relname,
              payload: msg.extra
            });
          });
          self.emit("connect");
          self._pulseQueryQueue(true);
          cb(null, this);
        });
      });
    };
    Client2.prototype.connect = function(callback) {
      if (callback) {
        this._connect(callback);
        return;
      }
      return new this._Promise((resolve, reject) => {
        this._connect((error) => {
          if (error) {
            reject(error);
          } else {
            resolve(this);
          }
        });
      });
    };
    Client2.prototype.query = function(config, values, callback) {
      let query;
      let result;
      let readTimeout;
      let readTimeoutTimer;
      let queryCallback;
      if (config === null || config === void 0) {
        throw new TypeError("Client was passed a null or undefined query");
      } else if (typeof config.submit === "function") {
        readTimeout = config.query_timeout || this.connectionParameters.query_timeout;
        result = query = config;
        if (typeof values === "function") {
          config.callback = values;
        }
      } else {
        readTimeout = config.query_timeout || this.connectionParameters.query_timeout;
        query = new NativeQuery(config, values, callback);
        if (!query.callback) {
          let resolveOut, rejectOut;
          result = new this._Promise((resolve, reject) => {
            resolveOut = resolve;
            rejectOut = reject;
          }).catch((err) => {
            Error.captureStackTrace(err);
            throw err;
          });
          query.callback = (err, res) => err ? rejectOut(err) : resolveOut(res);
        }
      }
      if (readTimeout) {
        queryCallback = query.callback || (() => {
        });
        readTimeoutTimer = setTimeout(() => {
          const error = new Error("Query read timeout");
          process.nextTick(() => {
            query.handleError(error, this.connection);
          });
          queryCallback(error);
          query.callback = () => {
          };
          const index = this._queryQueue.indexOf(query);
          if (index > -1) {
            this._queryQueue.splice(index, 1);
          }
          this._pulseQueryQueue();
        }, readTimeout);
        query.callback = (err, res) => {
          clearTimeout(readTimeoutTimer);
          queryCallback(err, res);
        };
      }
      if (!this._queryable) {
        query.native = this.native;
        process.nextTick(() => {
          query.handleError(new Error("Client has encountered a connection error and is not queryable"));
        });
        return result;
      }
      if (this._ending) {
        query.native = this.native;
        process.nextTick(() => {
          query.handleError(new Error("Client was closed and is not queryable"));
        });
        return result;
      }
      if (this._queryQueue.length > 0 && !this.pipeline) {
        queryQueueLengthDeprecationNotice();
      }
      this._queryQueue.push(query);
      this._pulseQueryQueue();
      return result;
    };
    Client2.prototype.end = function(cb) {
      const self = this;
      this._ending = true;
      if (this._connecting && !this._connected) {
        this.once("connect", () => {
          this.end(() => {
          });
        });
      }
      let result;
      if (!cb) {
        result = new this._Promise(function(resolve, reject) {
          cb = (err) => err ? reject(err) : resolve();
        });
      }
      const doEnd = function() {
        self.native.end(function() {
          self._connected = false;
          self._errorAllQueries(new Error("Connection terminated"));
          process.nextTick(() => {
            self.emit("end");
            if (cb) cb();
          });
        });
      };
      if (this.pipeline && (this._pipelineInFlight || this._queryQueue.length > 0)) {
        this.once("drain", doEnd);
      } else {
        doEnd();
      }
      return result;
    };
    Client2.prototype._hasActiveQuery = function() {
      return this._activeQuery && this._activeQuery.state !== "error" && this._activeQuery.state !== "end";
    };
    Client2.prototype._pulseQueryQueue = function(initialConnection) {
      if (!this._connected) {
        return;
      }
      if (this.pipeline && !initialConnection) {
        return this._pulsePipelinedQueryQueue();
      }
      if (this._hasActiveQuery()) {
        return;
      }
      const query = this._queryQueue.shift();
      if (!query) {
        if (!initialConnection) {
          this.emit("drain");
        }
        return;
      }
      this._activeQuery = query;
      query.submit(this);
      const self = this;
      query.once("_done", function() {
        self._pulseQueryQueue();
      });
    };
    Client2.prototype._pulsePipelinedQueryQueue = function() {
      if (!this._connected || this._pipelineInFlight) {
        return;
      }
      if (this._queryQueue.length === 0) {
        if (this.hasExecuted) {
          this.emit("drain");
        }
        return;
      }
      this._pipelineInFlight = true;
      const self = this;
      const queries = [];
      const nativeQueries = [];
      const utils = require_utils2();
      while (this._queryQueue.length > 0) {
        const query = this._queryQueue.shift();
        this.hasExecuted = true;
        nativeQueries.push(query);
        const values = query.values ? query.values.map(utils.prepareValue) : null;
        const pipelineEntry = { text: query.text, name: query.name, arrayMode: query._arrayMode };
        if (values) {
          pipelineEntry.values = values;
        }
        if (query.name && this.namedQueries[query.name]) {
          pipelineEntry._alreadyPrepared = true;
        }
        queries.push(pipelineEntry);
      }
      this.native.pipeline(queries, function(err, results) {
        self._pipelineInFlight = false;
        if (err) {
          self._connected = false;
          self._queryable = false;
          for (let i = 0; i < nativeQueries.length; i++) {
            const q = nativeQueries[i];
            q.native = self.native;
            q.handleError(err);
          }
          self._errorAllQueries(err);
          self.emit("error", err);
          self.emit("end");
          return;
        }
        for (let i = 0; i < nativeQueries.length; i++) {
          const q = nativeQueries[i];
          const r = results[i];
          q.native = self.native;
          if (r.err) {
            q.handleError(r.err);
          } else {
            if (q.name) {
              self.namedQueries[q.name] = q.text;
            }
            q.state = "end";
            q.emit("end", r.result);
            if (q.callback) {
              q.callback(null, r.result);
            }
          }
          setImmediate(function() {
            q.emit("_done");
          });
        }
        self._pulsePipelinedQueryQueue();
      });
    };
    Client2.prototype.cancel = function(query) {
      if (this._activeQuery === query) {
        this.native.cancel(function() {
        });
      } else if (this._queryQueue.indexOf(query) !== -1) {
        this._queryQueue.splice(this._queryQueue.indexOf(query), 1);
      }
    };
    Client2.prototype.ref = function() {
    };
    Client2.prototype.unref = function() {
    };
    Client2.prototype.setTypeParser = function(oid, format, parseFn) {
      return this._types.setTypeParser(oid, format, parseFn);
    };
    Client2.prototype.getTypeParser = function(oid, format) {
      return this._types.getTypeParser(oid, format);
    };
    Client2.prototype.isConnected = function() {
      return this._connected;
    };
    Client2.prototype.getTransactionStatus = function() {
      return this.native.getTransactionStatus();
    };
  }
});

// node_modules/.pnpm/pg@8.23.1/node_modules/pg/lib/native/index.js
var require_native = __commonJS({
  "node_modules/.pnpm/pg@8.23.1/node_modules/pg/lib/native/index.js"(exports2, module2) {
    "use strict";
    module2.exports = require_client2();
  }
});

// node_modules/.pnpm/pg@8.23.1/node_modules/pg/lib/index.js
var require_lib2 = __commonJS({
  "node_modules/.pnpm/pg@8.23.1/node_modules/pg/lib/index.js"(exports2, module2) {
    "use strict";
    var Client2 = require_client();
    var defaults2 = require_defaults2();
    var Connection2 = require_connection();
    var Result2 = require_result();
    var utils = require_utils2();
    var Pool2 = require_pg_pool();
    var TypeOverrides2 = require_type_overrides();
    var { DatabaseError: DatabaseError2 } = require_dist2();
    var { escapeIdentifier: escapeIdentifier2, escapeLiteral: escapeLiteral2 } = require_utils2();
    var poolFactory = (Client3) => {
      return class BoundPool extends Pool2 {
        constructor(options) {
          super(options, Client3);
        }
      };
    };
    var PG = function(clientConstructor2) {
      this.defaults = defaults2;
      this.Client = clientConstructor2;
      this.Query = this.Client.Query;
      this.Pool = poolFactory(this.Client);
      this._pools = [];
      this.Connection = Connection2;
      this.types = require_pg_types();
      this.DatabaseError = DatabaseError2;
      this.TypeOverrides = TypeOverrides2;
      this.escapeIdentifier = escapeIdentifier2;
      this.escapeLiteral = escapeLiteral2;
      this.Result = Result2;
      this.utils = utils;
    };
    var clientConstructor = Client2;
    var forceNative = false;
    try {
      forceNative = !!process.env.NODE_PG_FORCE_NATIVE;
    } catch {
    }
    if (forceNative) {
      clientConstructor = require_native();
    }
    module2.exports = new PG(clientConstructor);
    Object.defineProperty(module2.exports, "native", {
      configurable: true,
      enumerable: false,
      get() {
        let native = null;
        try {
          native = new PG(require_native());
        } catch (err) {
          if (err.code !== "MODULE_NOT_FOUND") {
            throw err;
          }
        }
        Object.defineProperty(module2.exports, "native", {
          value: native
        });
        return native;
      }
    });
  }
});

// packages/data/src/operational/adoption.ts
var adoption_exports = {};
__export(adoption_exports, {
  adoptCertifiedServing: () => adoptCertifiedServing,
  adoptLegacyServing: () => adoptLegacyServing
});
module.exports = __toCommonJS(adoption_exports);

// packages/data/src/operational/adoption-parity.ts
async function assertAdoptionHeadParity(client, tenantId) {
  const result = await client.query(`WITH members AS (
 SELECT member.month,member.partition_id FROM mart.analytics_trusted_serving trusted JOIN mart.analytics_serving_members member USING(tenant_id,revision_id)
 WHERE trusted.tenant_id=$1 AND member.family='facts'),
 heads AS (SELECT head.measure_id,(payload->>'businessDate')::date business_date,payload->'dimensions' dimensions,sum((payload->>'value')::numeric) value,count(*) fact_count
 FROM mart.analytics_fact_heads head JOIN mart.analytics_fact_revisions revision USING(tenant_id,fact_key,revision_id)
 WHERE head.tenant_id=$1 AND head.status='active' AND head.business_month=ANY(ARRAY(SELECT to_char(month,'YYYY-MM') FROM members)) GROUP BY 1,2,3),
 trusted AS (SELECT measure_id,business_date,dimensions,value,fact_count FROM members JOIN mart.analytics_aggregate_bases base USING(partition_id) WHERE base.tenant_id=$1)
 SELECT * FROM ((SELECT * FROM heads EXCEPT SELECT * FROM trusted) UNION ALL (SELECT * FROM trusted EXCEPT SELECT * FROM heads)) difference LIMIT 1`, [tenantId]);
  if (result.rowCount) throw new Error("Adoption requires canonical heads to match the current trusted partitions");
}

// packages/data/src/operational/adoption.ts
var import_node_crypto5 = require("node:crypto");

// packages/domain/src/metric-help-content.ts
var metricHelpContent = {
  "order_count": {
    "shortDefinition": {
      "en": "Number of confirmed sales orders; each order is counted once.",
      "ar": "\u0639\u062F\u062F \u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0628\u064A\u0639 \u0627\u0644\u0645\u0624\u0643\u062F\u0629\u061B \u064A\u064F\u062D\u062A\u0633\u0628 \u0643\u0644 \u0637\u0644\u0628 \u0645\u0631\u0629 \u0648\u0627\u062D\u062F\u0629."
    },
    "definition": {
      "en": "Number of confirmed sales orders; each order is counted once.",
      "ar": "\u0639\u062F\u062F \u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0628\u064A\u0639 \u0627\u0644\u0645\u0624\u0643\u062F\u0629\u061B \u064A\u064F\u062D\u062A\u0633\u0628 \u0643\u0644 \u0637\u0644\u0628 \u0645\u0631\u0629 \u0648\u0627\u062D\u062F\u0629."
    },
    "formula": {
      "en": "Count confirmed orders",
      "ar": "\u0639\u062F\u0651 \u0627\u0644\u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0645\u0624\u0643\u062F\u0629"
    },
    "inclusionSummary": {
      "en": "Confirmed sales orders, with cancelled orders counted separately.",
      "ar": "\u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0628\u064A\u0639 \u0627\u0644\u0645\u0624\u0643\u062F\u0629\u060C \u0645\u0639 \u0639\u062F\u0651 \u0627\u0644\u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0645\u0644\u063A\u0627\u0629 \u0628\u0635\u0648\u0631\u0629 \u0645\u0646\u0641\u0635\u0644\u0629."
    },
    "exclusionSummary": {
      "en": "Draft and cancelled documents are excluded.",
      "ar": "\u062A\u064F\u0633\u062A\u0628\u0639\u062F \u0627\u0644\u0645\u0633\u0648\u062F\u0627\u062A \u0648\u0627\u0644\u0645\u0633\u062A\u0646\u062F\u0627\u062A \u0627\u0644\u0645\u0644\u063A\u0627\u0629."
    },
    "dateBasis": {
      "en": "Order date in the tenant business timezone.",
      "ar": "\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0637\u0644\u0628 \u0648\u0641\u0642 \u0627\u0644\u0645\u0646\u0637\u0642\u0629 \u0627\u0644\u0632\u0645\u0646\u064A\u0629 \u0644\u0644\u0623\u0639\u0645\u0627\u0644."
    },
    "refundCreditBehavior": {
      "en": "Posted refunds reduce net invoiced revenue on their own invoice date. Refund Value shows their positive magnitude. Order metrics remain separate.",
      "ar": "\u062A\u064F\u062E\u0641\u0636 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0627\u0644\u062F\u0627\u0626\u0646\u0629 \u0627\u0644\u0645\u064F\u0631\u062D\u0651\u0644\u0629 \u0635\u0627\u0641\u064A \u0625\u064A\u0631\u0627\u062F\u0627\u062A \u0627\u0644\u0641\u0648\u0627\u062A\u064A\u0631 \u0628\u062A\u0627\u0631\u064A\u062E\u0647\u0627. \u0642\u064A\u0645\u0629 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u062A\u0639\u0631\u0636 \u0645\u0642\u062F\u0627\u0631\u0647\u0627 \u0627\u0644\u0645\u0648\u062C\u0628. \u0645\u0624\u0634\u0631\u0627\u062A \u0627\u0644\u0637\u0644\u0628\u0627\u062A \u0645\u0633\u062A\u0642\u0644\u0629."
    },
    "aggregationBehavior": {
      "en": "Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances.",
      "ar": "\u062A\u064F\u062C\u0645\u0639 \u0627\u0644\u0645\u0633\u0627\u0647\u0645\u0627\u062A \u0627\u0644\u0645\u0624\u0647\u0644\u0629 \u0639\u0644\u0649 \u0627\u0644\u0645\u0633\u062A\u0648\u0649 \u0627\u0644\u0645\u062D\u062F\u062F\u061B \u0627\u0644\u0646\u0633\u0628 \u0645\u0646 \u0625\u062C\u0645\u0627\u0644\u064A\u064A\u0646 \u0645\u062A\u0637\u0627\u0628\u0642\u064A\u0646\u060C \u0648\u0627\u0644\u0639\u062F\u0651 \u0627\u0644\u0645\u0645\u064A\u0632 \u064A\u0632\u064A\u0644 \u062A\u0643\u0631\u0627\u0631 \u0627\u0644\u0647\u0648\u064A\u0627\u062A\u060C \u0648\u0627\u0644\u0645\u062F\u062F \u062A\u062D\u062A\u0627\u062C \u0642\u0627\u0639\u062F\u0629 \u062A\u0631\u062C\u064A\u062D \u0645\u0639\u062A\u0645\u062F\u0629. \u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u062A\u062E\u062A\u0627\u0631 \u062D\u0627\u0644\u0629 \u0648\u0627\u062D\u062F\u0629 \u0644\u0643\u0644 \u0647\u0648\u064A\u0629 \u0639\u0646\u062F \u0627\u0644\u0642\u0637\u0639 \u0648\u062A\u064F\u062C\u0645\u0639 \u0639\u0628\u0631 \u0627\u0644\u0647\u0648\u064A\u0627\u062A \u0641\u0642\u0637. \u0644\u0627 \u062A\u064F\u062C\u0645\u0639 \u0627\u0644\u0646\u0633\u0628 \u0623\u0648 \u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u064A\u0648\u0645\u064A\u0629."
    },
    "definitionVersion": 1
  },
  "order_revenue": {
    "shortDefinition": {
      "en": "Total value of confirmed sales orders, including document tax.",
      "ar": "\u0625\u062C\u0645\u0627\u0644\u064A \u0642\u064A\u0645\u0629 \u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0628\u064A\u0639 \u0627\u0644\u0645\u0624\u0643\u062F\u0629 \u0634\u0627\u0645\u0644\u0627\u064B \u0636\u0631\u064A\u0628\u0629 \u0627\u0644\u0645\u0633\u062A\u0646\u062F."
    },
    "definition": {
      "en": "Total value of confirmed sales orders, including document tax.",
      "ar": "\u0625\u062C\u0645\u0627\u0644\u064A \u0642\u064A\u0645\u0629 \u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0628\u064A\u0639 \u0627\u0644\u0645\u0624\u0643\u062F\u0629 \u0634\u0627\u0645\u0644\u0627\u064B \u0636\u0631\u064A\u0628\u0629 \u0627\u0644\u0645\u0633\u062A\u0646\u062F."
    },
    "formula": {
      "en": "Confirmed Order Revenue",
      "ar": "\u0625\u064A\u0631\u0627\u062F\u0627\u062A \u0627\u0644\u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0645\u0624\u0643\u062F\u0629"
    },
    "inclusionSummary": {
      "en": "Confirmed sales orders, with cancelled orders counted separately.",
      "ar": "\u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0628\u064A\u0639 \u0627\u0644\u0645\u0624\u0643\u062F\u0629\u060C \u0645\u0639 \u0639\u062F\u0651 \u0627\u0644\u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0645\u0644\u063A\u0627\u0629 \u0628\u0635\u0648\u0631\u0629 \u0645\u0646\u0641\u0635\u0644\u0629."
    },
    "exclusionSummary": {
      "en": "Draft and cancelled documents are excluded.",
      "ar": "\u062A\u064F\u0633\u062A\u0628\u0639\u062F \u0627\u0644\u0645\u0633\u0648\u062F\u0627\u062A \u0648\u0627\u0644\u0645\u0633\u062A\u0646\u062F\u0627\u062A \u0627\u0644\u0645\u0644\u063A\u0627\u0629."
    },
    "dateBasis": {
      "en": "Order date in the tenant business timezone.",
      "ar": "\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0637\u0644\u0628 \u0648\u0641\u0642 \u0627\u0644\u0645\u0646\u0637\u0642\u0629 \u0627\u0644\u0632\u0645\u0646\u064A\u0629 \u0644\u0644\u0623\u0639\u0645\u0627\u0644."
    },
    "refundCreditBehavior": {
      "en": "Posted refunds reduce net invoiced revenue on their own invoice date. Refund Value shows their positive magnitude. Order metrics remain separate.",
      "ar": "\u062A\u064F\u062E\u0641\u0636 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0627\u0644\u062F\u0627\u0626\u0646\u0629 \u0627\u0644\u0645\u064F\u0631\u062D\u0651\u0644\u0629 \u0635\u0627\u0641\u064A \u0625\u064A\u0631\u0627\u062F\u0627\u062A \u0627\u0644\u0641\u0648\u0627\u062A\u064A\u0631 \u0628\u062A\u0627\u0631\u064A\u062E\u0647\u0627. \u0642\u064A\u0645\u0629 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u062A\u0639\u0631\u0636 \u0645\u0642\u062F\u0627\u0631\u0647\u0627 \u0627\u0644\u0645\u0648\u062C\u0628. \u0645\u0624\u0634\u0631\u0627\u062A \u0627\u0644\u0637\u0644\u0628\u0627\u062A \u0645\u0633\u062A\u0642\u0644\u0629."
    },
    "aggregationBehavior": {
      "en": "Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances.",
      "ar": "\u062A\u064F\u062C\u0645\u0639 \u0627\u0644\u0645\u0633\u0627\u0647\u0645\u0627\u062A \u0627\u0644\u0645\u0624\u0647\u0644\u0629 \u0639\u0644\u0649 \u0627\u0644\u0645\u0633\u062A\u0648\u0649 \u0627\u0644\u0645\u062D\u062F\u062F\u061B \u0627\u0644\u0646\u0633\u0628 \u0645\u0646 \u0625\u062C\u0645\u0627\u0644\u064A\u064A\u0646 \u0645\u062A\u0637\u0627\u0628\u0642\u064A\u0646\u060C \u0648\u0627\u0644\u0639\u062F\u0651 \u0627\u0644\u0645\u0645\u064A\u0632 \u064A\u0632\u064A\u0644 \u062A\u0643\u0631\u0627\u0631 \u0627\u0644\u0647\u0648\u064A\u0627\u062A\u060C \u0648\u0627\u0644\u0645\u062F\u062F \u062A\u062D\u062A\u0627\u062C \u0642\u0627\u0639\u062F\u0629 \u062A\u0631\u062C\u064A\u062D \u0645\u0639\u062A\u0645\u062F\u0629. \u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u062A\u062E\u062A\u0627\u0631 \u062D\u0627\u0644\u0629 \u0648\u0627\u062D\u062F\u0629 \u0644\u0643\u0644 \u0647\u0648\u064A\u0629 \u0639\u0646\u062F \u0627\u0644\u0642\u0637\u0639 \u0648\u062A\u064F\u062C\u0645\u0639 \u0639\u0628\u0631 \u0627\u0644\u0647\u0648\u064A\u0627\u062A \u0641\u0642\u0637. \u0644\u0627 \u062A\u064F\u062C\u0645\u0639 \u0627\u0644\u0646\u0633\u0628 \u0623\u0648 \u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u064A\u0648\u0645\u064A\u0629."
    },
    "definitionVersion": 1
  },
  "average_confirmed_order_value": {
    "shortDefinition": {
      "en": "Confirmed Order Revenue divided by confirmed Order Count.",
      "ar": "\u0625\u064A\u0631\u0627\u062F\u0627\u062A \u0627\u0644\u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0645\u0624\u0643\u062F\u0629 \u0645\u0642\u0633\u0648\u0645\u0629 \u0639\u0644\u0649 \u0639\u062F\u062F \u0627\u0644\u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0645\u0624\u0643\u062F\u0629."
    },
    "definition": {
      "en": "Confirmed Order Revenue divided by confirmed Order Count.",
      "ar": "\u0625\u064A\u0631\u0627\u062F\u0627\u062A \u0627\u0644\u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0645\u0624\u0643\u062F\u0629 \u0645\u0642\u0633\u0648\u0645\u0629 \u0639\u0644\u0649 \u0639\u062F\u062F \u0627\u0644\u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0645\u0624\u0643\u062F\u0629."
    },
    "formula": {
      "en": "Confirmed Order Revenue \xF7 Confirmed Order Count",
      "ar": "\u0625\u064A\u0631\u0627\u062F\u0627\u062A \u0627\u0644\u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0645\u0624\u0643\u062F\u0629 \xF7 \u0639\u062F\u062F \u0627\u0644\u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0645\u0624\u0643\u062F\u0629"
    },
    "inclusionSummary": {
      "en": "Confirmed sales orders, with cancelled orders counted separately.",
      "ar": "\u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0628\u064A\u0639 \u0627\u0644\u0645\u0624\u0643\u062F\u0629\u060C \u0645\u0639 \u0639\u062F\u0651 \u0627\u0644\u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0645\u0644\u063A\u0627\u0629 \u0628\u0635\u0648\u0631\u0629 \u0645\u0646\u0641\u0635\u0644\u0629."
    },
    "exclusionSummary": {
      "en": "Draft and cancelled documents are excluded.",
      "ar": "\u062A\u064F\u0633\u062A\u0628\u0639\u062F \u0627\u0644\u0645\u0633\u0648\u062F\u0627\u062A \u0648\u0627\u0644\u0645\u0633\u062A\u0646\u062F\u0627\u062A \u0627\u0644\u0645\u0644\u063A\u0627\u0629."
    },
    "dateBasis": {
      "en": "Order date in the tenant business timezone.",
      "ar": "\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0637\u0644\u0628 \u0648\u0641\u0642 \u0627\u0644\u0645\u0646\u0637\u0642\u0629 \u0627\u0644\u0632\u0645\u0646\u064A\u0629 \u0644\u0644\u0623\u0639\u0645\u0627\u0644."
    },
    "refundCreditBehavior": {
      "en": "Posted refunds reduce net invoiced revenue on their own invoice date. Refund Value shows their positive magnitude. Order metrics remain separate.",
      "ar": "\u062A\u064F\u062E\u0641\u0636 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0627\u0644\u062F\u0627\u0626\u0646\u0629 \u0627\u0644\u0645\u064F\u0631\u062D\u0651\u0644\u0629 \u0635\u0627\u0641\u064A \u0625\u064A\u0631\u0627\u062F\u0627\u062A \u0627\u0644\u0641\u0648\u0627\u062A\u064A\u0631 \u0628\u062A\u0627\u0631\u064A\u062E\u0647\u0627. \u0642\u064A\u0645\u0629 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u062A\u0639\u0631\u0636 \u0645\u0642\u062F\u0627\u0631\u0647\u0627 \u0627\u0644\u0645\u0648\u062C\u0628. \u0645\u0624\u0634\u0631\u0627\u062A \u0627\u0644\u0637\u0644\u0628\u0627\u062A \u0645\u0633\u062A\u0642\u0644\u0629."
    },
    "aggregationBehavior": {
      "en": "Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances.",
      "ar": "\u062A\u064F\u062C\u0645\u0639 \u0627\u0644\u0645\u0633\u0627\u0647\u0645\u0627\u062A \u0627\u0644\u0645\u0624\u0647\u0644\u0629 \u0639\u0644\u0649 \u0627\u0644\u0645\u0633\u062A\u0648\u0649 \u0627\u0644\u0645\u062D\u062F\u062F\u061B \u0627\u0644\u0646\u0633\u0628 \u0645\u0646 \u0625\u062C\u0645\u0627\u0644\u064A\u064A\u0646 \u0645\u062A\u0637\u0627\u0628\u0642\u064A\u0646\u060C \u0648\u0627\u0644\u0639\u062F\u0651 \u0627\u0644\u0645\u0645\u064A\u0632 \u064A\u0632\u064A\u0644 \u062A\u0643\u0631\u0627\u0631 \u0627\u0644\u0647\u0648\u064A\u0627\u062A\u060C \u0648\u0627\u0644\u0645\u062F\u062F \u062A\u062D\u062A\u0627\u062C \u0642\u0627\u0639\u062F\u0629 \u062A\u0631\u062C\u064A\u062D \u0645\u0639\u062A\u0645\u062F\u0629. \u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u062A\u062E\u062A\u0627\u0631 \u062D\u0627\u0644\u0629 \u0648\u0627\u062D\u062F\u0629 \u0644\u0643\u0644 \u0647\u0648\u064A\u0629 \u0639\u0646\u062F \u0627\u0644\u0642\u0637\u0639 \u0648\u062A\u064F\u062C\u0645\u0639 \u0639\u0628\u0631 \u0627\u0644\u0647\u0648\u064A\u0627\u062A \u0641\u0642\u0637. \u0644\u0627 \u062A\u064F\u062C\u0645\u0639 \u0627\u0644\u0646\u0633\u0628 \u0623\u0648 \u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u064A\u0648\u0645\u064A\u0629."
    },
    "definitionVersion": 1
  },
  "cancelled_orders": {
    "shortDefinition": {
      "en": "Number of cancelled sales orders by order date.",
      "ar": "\u0639\u062F\u062F \u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0628\u064A\u0639 \u0627\u0644\u0645\u0644\u063A\u0627\u0629 \u062D\u0633\u0628 \u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0637\u0644\u0628."
    },
    "definition": {
      "en": "Number of cancelled sales orders by order date.",
      "ar": "\u0639\u062F\u062F \u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0628\u064A\u0639 \u0627\u0644\u0645\u0644\u063A\u0627\u0629 \u062D\u0633\u0628 \u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0637\u0644\u0628."
    },
    "formula": {
      "en": "Count cancelled orders",
      "ar": "\u0639\u062F\u0651 \u0627\u0644\u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0645\u0644\u063A\u0627\u0629"
    },
    "inclusionSummary": {
      "en": "Confirmed sales orders, with cancelled orders counted separately.",
      "ar": "\u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0628\u064A\u0639 \u0627\u0644\u0645\u0624\u0643\u062F\u0629\u060C \u0645\u0639 \u0639\u062F\u0651 \u0627\u0644\u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0645\u0644\u063A\u0627\u0629 \u0628\u0635\u0648\u0631\u0629 \u0645\u0646\u0641\u0635\u0644\u0629."
    },
    "exclusionSummary": {
      "en": "Non-cancelled orders are excluded.",
      "ar": "\u062A\u064F\u0633\u062A\u0628\u0639\u062F \u0627\u0644\u0637\u0644\u0628\u0627\u062A \u063A\u064A\u0631 \u0627\u0644\u0645\u0644\u063A\u0627\u0629."
    },
    "dateBasis": {
      "en": "Order date in the tenant business timezone.",
      "ar": "\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0637\u0644\u0628 \u0648\u0641\u0642 \u0627\u0644\u0645\u0646\u0637\u0642\u0629 \u0627\u0644\u0632\u0645\u0646\u064A\u0629 \u0644\u0644\u0623\u0639\u0645\u0627\u0644."
    },
    "refundCreditBehavior": {
      "en": "Posted refunds reduce net invoiced revenue on their own invoice date. Refund Value shows their positive magnitude. Order metrics remain separate.",
      "ar": "\u062A\u064F\u062E\u0641\u0636 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0627\u0644\u062F\u0627\u0626\u0646\u0629 \u0627\u0644\u0645\u064F\u0631\u062D\u0651\u0644\u0629 \u0635\u0627\u0641\u064A \u0625\u064A\u0631\u0627\u062F\u0627\u062A \u0627\u0644\u0641\u0648\u0627\u062A\u064A\u0631 \u0628\u062A\u0627\u0631\u064A\u062E\u0647\u0627. \u0642\u064A\u0645\u0629 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u062A\u0639\u0631\u0636 \u0645\u0642\u062F\u0627\u0631\u0647\u0627 \u0627\u0644\u0645\u0648\u062C\u0628. \u0645\u0624\u0634\u0631\u0627\u062A \u0627\u0644\u0637\u0644\u0628\u0627\u062A \u0645\u0633\u062A\u0642\u0644\u0629."
    },
    "aggregationBehavior": {
      "en": "Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances.",
      "ar": "\u062A\u064F\u062C\u0645\u0639 \u0627\u0644\u0645\u0633\u0627\u0647\u0645\u0627\u062A \u0627\u0644\u0645\u0624\u0647\u0644\u0629 \u0639\u0644\u0649 \u0627\u0644\u0645\u0633\u062A\u0648\u0649 \u0627\u0644\u0645\u062D\u062F\u062F\u061B \u0627\u0644\u0646\u0633\u0628 \u0645\u0646 \u0625\u062C\u0645\u0627\u0644\u064A\u064A\u0646 \u0645\u062A\u0637\u0627\u0628\u0642\u064A\u0646\u060C \u0648\u0627\u0644\u0639\u062F\u0651 \u0627\u0644\u0645\u0645\u064A\u0632 \u064A\u0632\u064A\u0644 \u062A\u0643\u0631\u0627\u0631 \u0627\u0644\u0647\u0648\u064A\u0627\u062A\u060C \u0648\u0627\u0644\u0645\u062F\u062F \u062A\u062D\u062A\u0627\u062C \u0642\u0627\u0639\u062F\u0629 \u062A\u0631\u062C\u064A\u062D \u0645\u0639\u062A\u0645\u062F\u0629. \u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u062A\u062E\u062A\u0627\u0631 \u062D\u0627\u0644\u0629 \u0648\u0627\u062D\u062F\u0629 \u0644\u0643\u0644 \u0647\u0648\u064A\u0629 \u0639\u0646\u062F \u0627\u0644\u0642\u0637\u0639 \u0648\u062A\u064F\u062C\u0645\u0639 \u0639\u0628\u0631 \u0627\u0644\u0647\u0648\u064A\u0627\u062A \u0641\u0642\u0637. \u0644\u0627 \u062A\u064F\u062C\u0645\u0639 \u0627\u0644\u0646\u0633\u0628 \u0623\u0648 \u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u064A\u0648\u0645\u064A\u0629."
    },
    "definitionVersion": 1
  },
  "invoiced_revenue": {
    "shortDefinition": {
      "en": "Value of posted customer invoices, excluding refunds.",
      "ar": "\u0642\u064A\u0645\u0629 \u0641\u0648\u0627\u062A\u064A\u0631 \u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0627\u0644\u0645\u064F\u0631\u062D\u0651\u0644\u0629 \u062F\u0648\u0646 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0627\u0644\u062F\u0627\u0626\u0646\u0629."
    },
    "definition": {
      "en": "Value of posted customer invoices, excluding refunds.",
      "ar": "\u0642\u064A\u0645\u0629 \u0641\u0648\u0627\u062A\u064A\u0631 \u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0627\u0644\u0645\u064F\u0631\u062D\u0651\u0644\u0629 \u062F\u0648\u0646 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0627\u0644\u062F\u0627\u0626\u0646\u0629."
    },
    "formula": {
      "en": "Posted Invoice Value",
      "ar": "\u0642\u064A\u0645\u0629 \u0627\u0644\u0641\u0648\u0627\u062A\u064A\u0631 \u0627\u0644\u0645\u064F\u0631\u062D\u0651\u0644\u0629"
    },
    "inclusionSummary": {
      "en": "Posted customer invoices and posted credit notes; supplier bills excluded.",
      "ar": "\u0641\u0648\u0627\u062A\u064A\u0631 \u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0648\u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0627\u0644\u062F\u0627\u0626\u0646\u0629 \u0627\u0644\u0645\u064F\u0631\u062D\u0651\u0644\u0629\u061B \u062A\u064F\u0633\u062A\u0628\u0639\u062F \u0641\u0648\u0627\u062A\u064A\u0631 \u0627\u0644\u0645\u0648\u0631\u062F\u064A\u0646."
    },
    "exclusionSummary": {
      "en": "Draft and cancelled documents are excluded.",
      "ar": "\u062A\u064F\u0633\u062A\u0628\u0639\u062F \u0627\u0644\u0645\u0633\u0648\u062F\u0627\u062A \u0648\u0627\u0644\u0645\u0633\u062A\u0646\u062F\u0627\u062A \u0627\u0644\u0645\u0644\u063A\u0627\u0629."
    },
    "dateBasis": {
      "en": "Document invoice date; each refund uses its own issue date.",
      "ar": "\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629\u061B \u0643\u0644 \u0625\u0634\u0639\u0627\u0631 \u062F\u0627\u0626\u0646 \u064A\u064F\u062D\u062A\u0633\u0628 \u0628\u062A\u0627\u0631\u064A\u062E \u0625\u0635\u062F\u0627\u0631\u0647."
    },
    "refundCreditBehavior": {
      "en": "Posted refunds reduce net invoiced revenue on their own invoice date. Refund Value shows their positive magnitude. Order metrics remain separate.",
      "ar": "\u062A\u064F\u062E\u0641\u0636 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0627\u0644\u062F\u0627\u0626\u0646\u0629 \u0627\u0644\u0645\u064F\u0631\u062D\u0651\u0644\u0629 \u0635\u0627\u0641\u064A \u0625\u064A\u0631\u0627\u062F\u0627\u062A \u0627\u0644\u0641\u0648\u0627\u062A\u064A\u0631 \u0628\u062A\u0627\u0631\u064A\u062E\u0647\u0627. \u0642\u064A\u0645\u0629 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u062A\u0639\u0631\u0636 \u0645\u0642\u062F\u0627\u0631\u0647\u0627 \u0627\u0644\u0645\u0648\u062C\u0628. \u0645\u0624\u0634\u0631\u0627\u062A \u0627\u0644\u0637\u0644\u0628\u0627\u062A \u0645\u0633\u062A\u0642\u0644\u0629."
    },
    "aggregationBehavior": {
      "en": "Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances.",
      "ar": "\u062A\u064F\u062C\u0645\u0639 \u0627\u0644\u0645\u0633\u0627\u0647\u0645\u0627\u062A \u0627\u0644\u0645\u0624\u0647\u0644\u0629 \u0639\u0644\u0649 \u0627\u0644\u0645\u0633\u062A\u0648\u0649 \u0627\u0644\u0645\u062D\u062F\u062F\u061B \u0627\u0644\u0646\u0633\u0628 \u0645\u0646 \u0625\u062C\u0645\u0627\u0644\u064A\u064A\u0646 \u0645\u062A\u0637\u0627\u0628\u0642\u064A\u0646\u060C \u0648\u0627\u0644\u0639\u062F\u0651 \u0627\u0644\u0645\u0645\u064A\u0632 \u064A\u0632\u064A\u0644 \u062A\u0643\u0631\u0627\u0631 \u0627\u0644\u0647\u0648\u064A\u0627\u062A\u060C \u0648\u0627\u0644\u0645\u062F\u062F \u062A\u062D\u062A\u0627\u062C \u0642\u0627\u0639\u062F\u0629 \u062A\u0631\u062C\u064A\u062D \u0645\u0639\u062A\u0645\u062F\u0629. \u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u062A\u062E\u062A\u0627\u0631 \u062D\u0627\u0644\u0629 \u0648\u0627\u062D\u062F\u0629 \u0644\u0643\u0644 \u0647\u0648\u064A\u0629 \u0639\u0646\u062F \u0627\u0644\u0642\u0637\u0639 \u0648\u062A\u064F\u062C\u0645\u0639 \u0639\u0628\u0631 \u0627\u0644\u0647\u0648\u064A\u0627\u062A \u0641\u0642\u0637. \u0644\u0627 \u062A\u064F\u062C\u0645\u0639 \u0627\u0644\u0646\u0633\u0628 \u0623\u0648 \u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u064A\u0648\u0645\u064A\u0629."
    },
    "definitionVersion": 1
  },
  "refund_value": {
    "shortDefinition": {
      "en": "Posted customer refunds/credit notes shown as a positive value.",
      "ar": "\u0642\u064A\u0645\u0629 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0627\u0644\u062F\u0627\u0626\u0646\u0629 \u0644\u0644\u0639\u0645\u0644\u0627\u0621 \u0627\u0644\u0645\u064F\u0631\u062D\u0651\u0644\u0629 \u0645\u0639\u0631\u0648\u0636\u0629 \u0628\u0645\u0642\u062F\u0627\u0631 \u0645\u0648\u062C\u0628."
    },
    "definition": {
      "en": "Posted customer refunds/credit notes shown as a positive value.",
      "ar": "\u0642\u064A\u0645\u0629 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0627\u0644\u062F\u0627\u0626\u0646\u0629 \u0644\u0644\u0639\u0645\u0644\u0627\u0621 \u0627\u0644\u0645\u064F\u0631\u062D\u0651\u0644\u0629 \u0645\u0639\u0631\u0648\u0636\u0629 \u0628\u0645\u0642\u062F\u0627\u0631 \u0645\u0648\u062C\u0628."
    },
    "formula": {
      "en": "Positive value of posted credit notes",
      "ar": "\u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u0645\u0648\u062C\u0628\u0629 \u0644\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0627\u0644\u062F\u0627\u0626\u0646\u0629 \u0627\u0644\u0645\u064F\u0631\u062D\u0651\u0644\u0629"
    },
    "inclusionSummary": {
      "en": "Posted customer invoices and posted credit notes; supplier bills excluded.",
      "ar": "\u0641\u0648\u0627\u062A\u064A\u0631 \u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0648\u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0627\u0644\u062F\u0627\u0626\u0646\u0629 \u0627\u0644\u0645\u064F\u0631\u062D\u0651\u0644\u0629\u061B \u062A\u064F\u0633\u062A\u0628\u0639\u062F \u0641\u0648\u0627\u062A\u064A\u0631 \u0627\u0644\u0645\u0648\u0631\u062F\u064A\u0646."
    },
    "exclusionSummary": {
      "en": "Draft and cancelled documents are excluded.",
      "ar": "\u062A\u064F\u0633\u062A\u0628\u0639\u062F \u0627\u0644\u0645\u0633\u0648\u062F\u0627\u062A \u0648\u0627\u0644\u0645\u0633\u062A\u0646\u062F\u0627\u062A \u0627\u0644\u0645\u0644\u063A\u0627\u0629."
    },
    "dateBasis": {
      "en": "Document invoice date; each refund uses its own issue date.",
      "ar": "\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629\u061B \u0643\u0644 \u0625\u0634\u0639\u0627\u0631 \u062F\u0627\u0626\u0646 \u064A\u064F\u062D\u062A\u0633\u0628 \u0628\u062A\u0627\u0631\u064A\u062E \u0625\u0635\u062F\u0627\u0631\u0647."
    },
    "refundCreditBehavior": {
      "en": "Posted refunds reduce net invoiced revenue on their own invoice date. Refund Value shows their positive magnitude. Order metrics remain separate.",
      "ar": "\u062A\u064F\u062E\u0641\u0636 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0627\u0644\u062F\u0627\u0626\u0646\u0629 \u0627\u0644\u0645\u064F\u0631\u062D\u0651\u0644\u0629 \u0635\u0627\u0641\u064A \u0625\u064A\u0631\u0627\u062F\u0627\u062A \u0627\u0644\u0641\u0648\u0627\u062A\u064A\u0631 \u0628\u062A\u0627\u0631\u064A\u062E\u0647\u0627. \u0642\u064A\u0645\u0629 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u062A\u0639\u0631\u0636 \u0645\u0642\u062F\u0627\u0631\u0647\u0627 \u0627\u0644\u0645\u0648\u062C\u0628. \u0645\u0624\u0634\u0631\u0627\u062A \u0627\u0644\u0637\u0644\u0628\u0627\u062A \u0645\u0633\u062A\u0642\u0644\u0629."
    },
    "aggregationBehavior": {
      "en": "Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances.",
      "ar": "\u062A\u064F\u062C\u0645\u0639 \u0627\u0644\u0645\u0633\u0627\u0647\u0645\u0627\u062A \u0627\u0644\u0645\u0624\u0647\u0644\u0629 \u0639\u0644\u0649 \u0627\u0644\u0645\u0633\u062A\u0648\u0649 \u0627\u0644\u0645\u062D\u062F\u062F\u061B \u0627\u0644\u0646\u0633\u0628 \u0645\u0646 \u0625\u062C\u0645\u0627\u0644\u064A\u064A\u0646 \u0645\u062A\u0637\u0627\u0628\u0642\u064A\u0646\u060C \u0648\u0627\u0644\u0639\u062F\u0651 \u0627\u0644\u0645\u0645\u064A\u0632 \u064A\u0632\u064A\u0644 \u062A\u0643\u0631\u0627\u0631 \u0627\u0644\u0647\u0648\u064A\u0627\u062A\u060C \u0648\u0627\u0644\u0645\u062F\u062F \u062A\u062D\u062A\u0627\u062C \u0642\u0627\u0639\u062F\u0629 \u062A\u0631\u062C\u064A\u062D \u0645\u0639\u062A\u0645\u062F\u0629. \u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u062A\u062E\u062A\u0627\u0631 \u062D\u0627\u0644\u0629 \u0648\u0627\u062D\u062F\u0629 \u0644\u0643\u0644 \u0647\u0648\u064A\u0629 \u0639\u0646\u062F \u0627\u0644\u0642\u0637\u0639 \u0648\u062A\u064F\u062C\u0645\u0639 \u0639\u0628\u0631 \u0627\u0644\u0647\u0648\u064A\u0627\u062A \u0641\u0642\u0637. \u0644\u0627 \u062A\u064F\u062C\u0645\u0639 \u0627\u0644\u0646\u0633\u0628 \u0623\u0648 \u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u064A\u0648\u0645\u064A\u0629."
    },
    "definitionVersion": 1
  },
  "net_invoiced_revenue": {
    "shortDefinition": {
      "en": "Posted customer invoices minus posted refunds/credit notes, on each document\u2019s own invoice date.",
      "ar": "\u0641\u0648\u0627\u062A\u064A\u0631 \u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0627\u0644\u0645\u064F\u0631\u062D\u0651\u0644\u0629 \u0646\u0627\u0642\u0635 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0627\u0644\u062F\u0627\u0626\u0646\u0629 \u0627\u0644\u0645\u064F\u0631\u062D\u0651\u0644\u0629\u060C \u062D\u0633\u0628 \u062A\u0627\u0631\u064A\u062E \u0643\u0644 \u0645\u0633\u062A\u0646\u062F."
    },
    "definition": {
      "en": "Posted customer invoices minus posted refunds/credit notes, on each document\u2019s own invoice date.",
      "ar": "\u0641\u0648\u0627\u062A\u064A\u0631 \u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0627\u0644\u0645\u064F\u0631\u062D\u0651\u0644\u0629 \u0646\u0627\u0642\u0635 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0627\u0644\u062F\u0627\u0626\u0646\u0629 \u0627\u0644\u0645\u064F\u0631\u062D\u0651\u0644\u0629\u060C \u062D\u0633\u0628 \u062A\u0627\u0631\u064A\u062E \u0643\u0644 \u0645\u0633\u062A\u0646\u062F."
    },
    "formula": {
      "en": "Posted Invoice Value \u2212 Refund Value",
      "ar": "\u0642\u064A\u0645\u0629 \u0627\u0644\u0641\u0648\u0627\u062A\u064A\u0631 \u0627\u0644\u0645\u064F\u0631\u062D\u0651\u0644\u0629 \u2212 \u0642\u064A\u0645\u0629 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0627\u0644\u062F\u0627\u0626\u0646\u0629"
    },
    "inclusionSummary": {
      "en": "Posted customer invoices and posted credit notes; supplier bills excluded.",
      "ar": "\u0641\u0648\u0627\u062A\u064A\u0631 \u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0648\u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0627\u0644\u062F\u0627\u0626\u0646\u0629 \u0627\u0644\u0645\u064F\u0631\u062D\u0651\u0644\u0629\u061B \u062A\u064F\u0633\u062A\u0628\u0639\u062F \u0641\u0648\u0627\u062A\u064A\u0631 \u0627\u0644\u0645\u0648\u0631\u062F\u064A\u0646."
    },
    "exclusionSummary": {
      "en": "Draft and cancelled documents are excluded.",
      "ar": "\u062A\u064F\u0633\u062A\u0628\u0639\u062F \u0627\u0644\u0645\u0633\u0648\u062F\u0627\u062A \u0648\u0627\u0644\u0645\u0633\u062A\u0646\u062F\u0627\u062A \u0627\u0644\u0645\u0644\u063A\u0627\u0629."
    },
    "dateBasis": {
      "en": "Document invoice date; each refund uses its own issue date.",
      "ar": "\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629\u061B \u0643\u0644 \u0625\u0634\u0639\u0627\u0631 \u062F\u0627\u0626\u0646 \u064A\u064F\u062D\u062A\u0633\u0628 \u0628\u062A\u0627\u0631\u064A\u062E \u0625\u0635\u062F\u0627\u0631\u0647."
    },
    "refundCreditBehavior": {
      "en": "Posted refunds reduce net invoiced revenue on their own invoice date. Refund Value shows their positive magnitude. Order metrics remain separate.",
      "ar": "\u062A\u064F\u062E\u0641\u0636 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0627\u0644\u062F\u0627\u0626\u0646\u0629 \u0627\u0644\u0645\u064F\u0631\u062D\u0651\u0644\u0629 \u0635\u0627\u0641\u064A \u0625\u064A\u0631\u0627\u062F\u0627\u062A \u0627\u0644\u0641\u0648\u0627\u062A\u064A\u0631 \u0628\u062A\u0627\u0631\u064A\u062E\u0647\u0627. \u0642\u064A\u0645\u0629 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u062A\u0639\u0631\u0636 \u0645\u0642\u062F\u0627\u0631\u0647\u0627 \u0627\u0644\u0645\u0648\u062C\u0628. \u0645\u0624\u0634\u0631\u0627\u062A \u0627\u0644\u0637\u0644\u0628\u0627\u062A \u0645\u0633\u062A\u0642\u0644\u0629."
    },
    "aggregationBehavior": {
      "en": "Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances.",
      "ar": "\u062A\u064F\u062C\u0645\u0639 \u0627\u0644\u0645\u0633\u0627\u0647\u0645\u0627\u062A \u0627\u0644\u0645\u0624\u0647\u0644\u0629 \u0639\u0644\u0649 \u0627\u0644\u0645\u0633\u062A\u0648\u0649 \u0627\u0644\u0645\u062D\u062F\u062F\u061B \u0627\u0644\u0646\u0633\u0628 \u0645\u0646 \u0625\u062C\u0645\u0627\u0644\u064A\u064A\u0646 \u0645\u062A\u0637\u0627\u0628\u0642\u064A\u0646\u060C \u0648\u0627\u0644\u0639\u062F\u0651 \u0627\u0644\u0645\u0645\u064A\u0632 \u064A\u0632\u064A\u0644 \u062A\u0643\u0631\u0627\u0631 \u0627\u0644\u0647\u0648\u064A\u0627\u062A\u060C \u0648\u0627\u0644\u0645\u062F\u062F \u062A\u062D\u062A\u0627\u062C \u0642\u0627\u0639\u062F\u0629 \u062A\u0631\u062C\u064A\u062D \u0645\u0639\u062A\u0645\u062F\u0629. \u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u062A\u062E\u062A\u0627\u0631 \u062D\u0627\u0644\u0629 \u0648\u0627\u062D\u062F\u0629 \u0644\u0643\u0644 \u0647\u0648\u064A\u0629 \u0639\u0646\u062F \u0627\u0644\u0642\u0637\u0639 \u0648\u062A\u064F\u062C\u0645\u0639 \u0639\u0628\u0631 \u0627\u0644\u0647\u0648\u064A\u0627\u062A \u0641\u0642\u0637. \u0644\u0627 \u062A\u064F\u062C\u0645\u0639 \u0627\u0644\u0646\u0633\u0628 \u0623\u0648 \u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u064A\u0648\u0645\u064A\u0629."
    },
    "definitionVersion": 1
  },
  "invoice_count": {
    "shortDefinition": {
      "en": "Number of posted customer invoice documents; refunds excluded.",
      "ar": "\u0639\u062F\u062F \u0645\u0633\u062A\u0646\u062F\u0627\u062A \u0641\u0648\u0627\u062A\u064A\u0631 \u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0627\u0644\u0645\u064F\u0631\u062D\u0651\u0644\u0629 \u062F\u0648\u0646 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0627\u0644\u062F\u0627\u0626\u0646\u0629."
    },
    "definition": {
      "en": "Number of posted customer invoice documents; refunds excluded.",
      "ar": "\u0639\u062F\u062F \u0645\u0633\u062A\u0646\u062F\u0627\u062A \u0641\u0648\u0627\u062A\u064A\u0631 \u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0627\u0644\u0645\u064F\u0631\u062D\u0651\u0644\u0629 \u062F\u0648\u0646 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0627\u0644\u062F\u0627\u0626\u0646\u0629."
    },
    "formula": {
      "en": "Count posted customer invoices",
      "ar": "\u0639\u062F\u0651 \u0641\u0648\u0627\u062A\u064A\u0631 \u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0627\u0644\u0645\u064F\u0631\u062D\u0651\u0644\u0629"
    },
    "inclusionSummary": {
      "en": "Posted customer invoices and posted credit notes; supplier bills excluded.",
      "ar": "\u0641\u0648\u0627\u062A\u064A\u0631 \u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0648\u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0627\u0644\u062F\u0627\u0626\u0646\u0629 \u0627\u0644\u0645\u064F\u0631\u062D\u0651\u0644\u0629\u061B \u062A\u064F\u0633\u062A\u0628\u0639\u062F \u0641\u0648\u0627\u062A\u064A\u0631 \u0627\u0644\u0645\u0648\u0631\u062F\u064A\u0646."
    },
    "exclusionSummary": {
      "en": "Draft and cancelled documents are excluded.",
      "ar": "\u062A\u064F\u0633\u062A\u0628\u0639\u062F \u0627\u0644\u0645\u0633\u0648\u062F\u0627\u062A \u0648\u0627\u0644\u0645\u0633\u062A\u0646\u062F\u0627\u062A \u0627\u0644\u0645\u0644\u063A\u0627\u0629."
    },
    "dateBasis": {
      "en": "Document invoice date; each refund uses its own issue date.",
      "ar": "\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629\u061B \u0643\u0644 \u0625\u0634\u0639\u0627\u0631 \u062F\u0627\u0626\u0646 \u064A\u064F\u062D\u062A\u0633\u0628 \u0628\u062A\u0627\u0631\u064A\u062E \u0625\u0635\u062F\u0627\u0631\u0647."
    },
    "refundCreditBehavior": {
      "en": "Posted refunds reduce net invoiced revenue on their own invoice date. Refund Value shows their positive magnitude. Order metrics remain separate.",
      "ar": "\u062A\u064F\u062E\u0641\u0636 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0627\u0644\u062F\u0627\u0626\u0646\u0629 \u0627\u0644\u0645\u064F\u0631\u062D\u0651\u0644\u0629 \u0635\u0627\u0641\u064A \u0625\u064A\u0631\u0627\u062F\u0627\u062A \u0627\u0644\u0641\u0648\u0627\u062A\u064A\u0631 \u0628\u062A\u0627\u0631\u064A\u062E\u0647\u0627. \u0642\u064A\u0645\u0629 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u062A\u0639\u0631\u0636 \u0645\u0642\u062F\u0627\u0631\u0647\u0627 \u0627\u0644\u0645\u0648\u062C\u0628. \u0645\u0624\u0634\u0631\u0627\u062A \u0627\u0644\u0637\u0644\u0628\u0627\u062A \u0645\u0633\u062A\u0642\u0644\u0629."
    },
    "aggregationBehavior": {
      "en": "Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances.",
      "ar": "\u062A\u064F\u062C\u0645\u0639 \u0627\u0644\u0645\u0633\u0627\u0647\u0645\u0627\u062A \u0627\u0644\u0645\u0624\u0647\u0644\u0629 \u0639\u0644\u0649 \u0627\u0644\u0645\u0633\u062A\u0648\u0649 \u0627\u0644\u0645\u062D\u062F\u062F\u061B \u0627\u0644\u0646\u0633\u0628 \u0645\u0646 \u0625\u062C\u0645\u0627\u0644\u064A\u064A\u0646 \u0645\u062A\u0637\u0627\u0628\u0642\u064A\u0646\u060C \u0648\u0627\u0644\u0639\u062F\u0651 \u0627\u0644\u0645\u0645\u064A\u0632 \u064A\u0632\u064A\u0644 \u062A\u0643\u0631\u0627\u0631 \u0627\u0644\u0647\u0648\u064A\u0627\u062A\u060C \u0648\u0627\u0644\u0645\u062F\u062F \u062A\u062D\u062A\u0627\u062C \u0642\u0627\u0639\u062F\u0629 \u062A\u0631\u062C\u064A\u062D \u0645\u0639\u062A\u0645\u062F\u0629. \u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u062A\u062E\u062A\u0627\u0631 \u062D\u0627\u0644\u0629 \u0648\u0627\u062D\u062F\u0629 \u0644\u0643\u0644 \u0647\u0648\u064A\u0629 \u0639\u0646\u062F \u0627\u0644\u0642\u0637\u0639 \u0648\u062A\u064F\u062C\u0645\u0639 \u0639\u0628\u0631 \u0627\u0644\u0647\u0648\u064A\u0627\u062A \u0641\u0642\u0637. \u0644\u0627 \u062A\u064F\u062C\u0645\u0639 \u0627\u0644\u0646\u0633\u0628 \u0623\u0648 \u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u064A\u0648\u0645\u064A\u0629."
    },
    "definitionVersion": 1
  },
  "refund_count": {
    "shortDefinition": {
      "en": "Number of posted customer credit-note documents.",
      "ar": "\u0639\u062F\u062F \u0645\u0633\u062A\u0646\u062F\u0627\u062A \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0627\u0644\u062F\u0627\u0626\u0646\u0629 \u0644\u0644\u0639\u0645\u0644\u0627\u0621 \u0627\u0644\u0645\u064F\u0631\u062D\u0651\u0644\u0629."
    },
    "definition": {
      "en": "Number of posted customer credit-note documents.",
      "ar": "\u0639\u062F\u062F \u0645\u0633\u062A\u0646\u062F\u0627\u062A \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0627\u0644\u062F\u0627\u0626\u0646\u0629 \u0644\u0644\u0639\u0645\u0644\u0627\u0621 \u0627\u0644\u0645\u064F\u0631\u062D\u0651\u0644\u0629."
    },
    "formula": {
      "en": "Count posted credit notes",
      "ar": "\u0639\u062F\u0651 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0627\u0644\u062F\u0627\u0626\u0646\u0629 \u0627\u0644\u0645\u064F\u0631\u062D\u0651\u0644\u0629"
    },
    "inclusionSummary": {
      "en": "Posted customer invoices and posted credit notes; supplier bills excluded.",
      "ar": "\u0641\u0648\u0627\u062A\u064A\u0631 \u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0648\u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0627\u0644\u062F\u0627\u0626\u0646\u0629 \u0627\u0644\u0645\u064F\u0631\u062D\u0651\u0644\u0629\u061B \u062A\u064F\u0633\u062A\u0628\u0639\u062F \u0641\u0648\u0627\u062A\u064A\u0631 \u0627\u0644\u0645\u0648\u0631\u062F\u064A\u0646."
    },
    "exclusionSummary": {
      "en": "Draft and cancelled documents are excluded.",
      "ar": "\u062A\u064F\u0633\u062A\u0628\u0639\u062F \u0627\u0644\u0645\u0633\u0648\u062F\u0627\u062A \u0648\u0627\u0644\u0645\u0633\u062A\u0646\u062F\u0627\u062A \u0627\u0644\u0645\u0644\u063A\u0627\u0629."
    },
    "dateBasis": {
      "en": "Document invoice date; each refund uses its own issue date.",
      "ar": "\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629\u061B \u0643\u0644 \u0625\u0634\u0639\u0627\u0631 \u062F\u0627\u0626\u0646 \u064A\u064F\u062D\u062A\u0633\u0628 \u0628\u062A\u0627\u0631\u064A\u062E \u0625\u0635\u062F\u0627\u0631\u0647."
    },
    "refundCreditBehavior": {
      "en": "Posted refunds reduce net invoiced revenue on their own invoice date. Refund Value shows their positive magnitude. Order metrics remain separate.",
      "ar": "\u062A\u064F\u062E\u0641\u0636 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0627\u0644\u062F\u0627\u0626\u0646\u0629 \u0627\u0644\u0645\u064F\u0631\u062D\u0651\u0644\u0629 \u0635\u0627\u0641\u064A \u0625\u064A\u0631\u0627\u062F\u0627\u062A \u0627\u0644\u0641\u0648\u0627\u062A\u064A\u0631 \u0628\u062A\u0627\u0631\u064A\u062E\u0647\u0627. \u0642\u064A\u0645\u0629 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u062A\u0639\u0631\u0636 \u0645\u0642\u062F\u0627\u0631\u0647\u0627 \u0627\u0644\u0645\u0648\u062C\u0628. \u0645\u0624\u0634\u0631\u0627\u062A \u0627\u0644\u0637\u0644\u0628\u0627\u062A \u0645\u0633\u062A\u0642\u0644\u0629."
    },
    "aggregationBehavior": {
      "en": "Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances.",
      "ar": "\u062A\u064F\u062C\u0645\u0639 \u0627\u0644\u0645\u0633\u0627\u0647\u0645\u0627\u062A \u0627\u0644\u0645\u0624\u0647\u0644\u0629 \u0639\u0644\u0649 \u0627\u0644\u0645\u0633\u062A\u0648\u0649 \u0627\u0644\u0645\u062D\u062F\u062F\u061B \u0627\u0644\u0646\u0633\u0628 \u0645\u0646 \u0625\u062C\u0645\u0627\u0644\u064A\u064A\u0646 \u0645\u062A\u0637\u0627\u0628\u0642\u064A\u0646\u060C \u0648\u0627\u0644\u0639\u062F\u0651 \u0627\u0644\u0645\u0645\u064A\u0632 \u064A\u0632\u064A\u0644 \u062A\u0643\u0631\u0627\u0631 \u0627\u0644\u0647\u0648\u064A\u0627\u062A\u060C \u0648\u0627\u0644\u0645\u062F\u062F \u062A\u062D\u062A\u0627\u062C \u0642\u0627\u0639\u062F\u0629 \u062A\u0631\u062C\u064A\u062D \u0645\u0639\u062A\u0645\u062F\u0629. \u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u062A\u062E\u062A\u0627\u0631 \u062D\u0627\u0644\u0629 \u0648\u0627\u062D\u062F\u0629 \u0644\u0643\u0644 \u0647\u0648\u064A\u0629 \u0639\u0646\u062F \u0627\u0644\u0642\u0637\u0639 \u0648\u062A\u064F\u062C\u0645\u0639 \u0639\u0628\u0631 \u0627\u0644\u0647\u0648\u064A\u0627\u062A \u0641\u0642\u0637. \u0644\u0627 \u062A\u064F\u062C\u0645\u0639 \u0627\u0644\u0646\u0633\u0628 \u0623\u0648 \u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u064A\u0648\u0645\u064A\u0629."
    },
    "definitionVersion": 1
  },
  "average_invoice_value": {
    "shortDefinition": {
      "en": "Posted Invoice Value divided by posted Invoice Count; refunds are excluded.",
      "ar": "\u0642\u064A\u0645\u0629 \u0627\u0644\u0641\u0648\u0627\u062A\u064A\u0631 \u0627\u0644\u0645\u064F\u0631\u062D\u0651\u0644\u0629 \u0645\u0642\u0633\u0648\u0645\u0629 \u0639\u0644\u0649 \u0639\u062F\u062F\u0647\u0627\u061B \u062A\u064F\u0633\u062A\u0628\u0639\u062F \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0627\u0644\u062F\u0627\u0626\u0646\u0629."
    },
    "definition": {
      "en": "Posted Invoice Value divided by posted Invoice Count; refunds are excluded.",
      "ar": "\u0642\u064A\u0645\u0629 \u0627\u0644\u0641\u0648\u0627\u062A\u064A\u0631 \u0627\u0644\u0645\u064F\u0631\u062D\u0651\u0644\u0629 \u0645\u0642\u0633\u0648\u0645\u0629 \u0639\u0644\u0649 \u0639\u062F\u062F\u0647\u0627\u061B \u062A\u064F\u0633\u062A\u0628\u0639\u062F \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0627\u0644\u062F\u0627\u0626\u0646\u0629."
    },
    "formula": {
      "en": "Posted Invoice Value \xF7 Invoice Count",
      "ar": "\u0642\u064A\u0645\u0629 \u0627\u0644\u0641\u0648\u0627\u062A\u064A\u0631 \u0627\u0644\u0645\u064F\u0631\u062D\u0651\u0644\u0629 \xF7 \u0639\u062F\u062F \u0627\u0644\u0641\u0648\u0627\u062A\u064A\u0631"
    },
    "inclusionSummary": {
      "en": "Posted customer invoices and posted credit notes; supplier bills excluded.",
      "ar": "\u0641\u0648\u0627\u062A\u064A\u0631 \u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0648\u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0627\u0644\u062F\u0627\u0626\u0646\u0629 \u0627\u0644\u0645\u064F\u0631\u062D\u0651\u0644\u0629\u061B \u062A\u064F\u0633\u062A\u0628\u0639\u062F \u0641\u0648\u0627\u062A\u064A\u0631 \u0627\u0644\u0645\u0648\u0631\u062F\u064A\u0646."
    },
    "exclusionSummary": {
      "en": "Draft and cancelled documents are excluded.",
      "ar": "\u062A\u064F\u0633\u062A\u0628\u0639\u062F \u0627\u0644\u0645\u0633\u0648\u062F\u0627\u062A \u0648\u0627\u0644\u0645\u0633\u062A\u0646\u062F\u0627\u062A \u0627\u0644\u0645\u0644\u063A\u0627\u0629."
    },
    "dateBasis": {
      "en": "Document invoice date; each refund uses its own issue date.",
      "ar": "\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629\u061B \u0643\u0644 \u0625\u0634\u0639\u0627\u0631 \u062F\u0627\u0626\u0646 \u064A\u064F\u062D\u062A\u0633\u0628 \u0628\u062A\u0627\u0631\u064A\u062E \u0625\u0635\u062F\u0627\u0631\u0647."
    },
    "refundCreditBehavior": {
      "en": "Posted refunds reduce net invoiced revenue on their own invoice date. Refund Value shows their positive magnitude. Order metrics remain separate.",
      "ar": "\u062A\u064F\u062E\u0641\u0636 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0627\u0644\u062F\u0627\u0626\u0646\u0629 \u0627\u0644\u0645\u064F\u0631\u062D\u0651\u0644\u0629 \u0635\u0627\u0641\u064A \u0625\u064A\u0631\u0627\u062F\u0627\u062A \u0627\u0644\u0641\u0648\u0627\u062A\u064A\u0631 \u0628\u062A\u0627\u0631\u064A\u062E\u0647\u0627. \u0642\u064A\u0645\u0629 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u062A\u0639\u0631\u0636 \u0645\u0642\u062F\u0627\u0631\u0647\u0627 \u0627\u0644\u0645\u0648\u062C\u0628. \u0645\u0624\u0634\u0631\u0627\u062A \u0627\u0644\u0637\u0644\u0628\u0627\u062A \u0645\u0633\u062A\u0642\u0644\u0629."
    },
    "aggregationBehavior": {
      "en": "Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances.",
      "ar": "\u062A\u064F\u062C\u0645\u0639 \u0627\u0644\u0645\u0633\u0627\u0647\u0645\u0627\u062A \u0627\u0644\u0645\u0624\u0647\u0644\u0629 \u0639\u0644\u0649 \u0627\u0644\u0645\u0633\u062A\u0648\u0649 \u0627\u0644\u0645\u062D\u062F\u062F\u061B \u0627\u0644\u0646\u0633\u0628 \u0645\u0646 \u0625\u062C\u0645\u0627\u0644\u064A\u064A\u0646 \u0645\u062A\u0637\u0627\u0628\u0642\u064A\u0646\u060C \u0648\u0627\u0644\u0639\u062F\u0651 \u0627\u0644\u0645\u0645\u064A\u0632 \u064A\u0632\u064A\u0644 \u062A\u0643\u0631\u0627\u0631 \u0627\u0644\u0647\u0648\u064A\u0627\u062A\u060C \u0648\u0627\u0644\u0645\u062F\u062F \u062A\u062D\u062A\u0627\u062C \u0642\u0627\u0639\u062F\u0629 \u062A\u0631\u062C\u064A\u062D \u0645\u0639\u062A\u0645\u062F\u0629. \u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u062A\u062E\u062A\u0627\u0631 \u062D\u0627\u0644\u0629 \u0648\u0627\u062D\u062F\u0629 \u0644\u0643\u0644 \u0647\u0648\u064A\u0629 \u0639\u0646\u062F \u0627\u0644\u0642\u0637\u0639 \u0648\u062A\u064F\u062C\u0645\u0639 \u0639\u0628\u0631 \u0627\u0644\u0647\u0648\u064A\u0627\u062A \u0641\u0642\u0637. \u0644\u0627 \u062A\u064F\u062C\u0645\u0639 \u0627\u0644\u0646\u0633\u0628 \u0623\u0648 \u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u064A\u0648\u0645\u064A\u0629."
    },
    "definitionVersion": 1
  },
  "overdue_amount": {
    "shortDefinition": {
      "en": "current residual where due before as-of",
      "ar": "\u0627\u0644\u0631\u0635\u064A\u062F \u0627\u0644\u0645\u062A\u0628\u0642\u064A \u0630\u0648 \u0627\u0633\u062A\u062D\u0642\u0627\u0642 \u064A\u0633\u0628\u0642 \u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0631\u0635\u064A\u062F\u061B \u0627\u062E\u062A\u064A\u0627\u0631 \u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0645\u0648\u062C\u0628 \u0623\u0648 \u0627\u0644\u0635\u0627\u0641\u064A \u064A\u062D\u062A\u0627\u062C \u062A\u0639\u0631\u064A\u0641\u0627\u064B \u0645\u0646\u0641\u0635\u0644\u0627\u064B"
    },
    "definition": {
      "en": "current residual where due before as-of",
      "ar": "\u0627\u0644\u0631\u0635\u064A\u062F \u0627\u0644\u0645\u062A\u0628\u0642\u064A \u0630\u0648 \u0627\u0633\u062A\u062D\u0642\u0627\u0642 \u064A\u0633\u0628\u0642 \u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0631\u0635\u064A\u062F\u061B \u0627\u062E\u062A\u064A\u0627\u0631 \u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0645\u0648\u062C\u0628 \u0623\u0648 \u0627\u0644\u0635\u0627\u0641\u064A \u064A\u062D\u062A\u0627\u062C \u062A\u0639\u0631\u064A\u0641\u0627\u064B \u0645\u0646\u0641\u0635\u0644\u0627\u064B"
    },
    "formula": {
      "en": "current residual where due before as-of",
      "ar": "\u0627\u0644\u0631\u0635\u064A\u062F \u0627\u0644\u0645\u062A\u0628\u0642\u064A \u0630\u0648 \u0627\u0633\u062A\u062D\u0642\u0627\u0642 \u064A\u0633\u0628\u0642 \u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0631\u0635\u064A\u062F\u061B \u0627\u062E\u062A\u064A\u0627\u0631 \u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0645\u0648\u062C\u0628 \u0623\u0648 \u0627\u0644\u0635\u0627\u0641\u064A \u064A\u062D\u062A\u0627\u062C \u062A\u0639\u0631\u064A\u0641\u0627\u064B \u0645\u0646\u0641\u0635\u0644\u0627\u064B"
    },
    "inclusionSummary": {
      "en": "Posted receivable ledger components, including eligible opening entries; no draft/cancelled entries. Candidate policies remain separate.",
      "ar": "\u0645\u0643\u0648\u0646\u0627\u062A \u0642\u064A\u0648\u062F \u0627\u0644\u0630\u0645\u0645 \u0627\u0644\u0645\u064F\u0631\u062D\u0651\u0644\u0629\u060C \u0628\u0645\u0627 \u0641\u064A\u0647\u0627 \u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u0627\u0641\u062A\u062A\u0627\u062D \u0627\u0644\u0645\u0624\u0647\u0644\u0629\u061B \u062F\u0648\u0646 \u0627\u0644\u0645\u0633\u0648\u062F\u0627\u062A \u0648\u0627\u0644\u0642\u064A\u0648\u062F \u0627\u0644\u0645\u0644\u063A\u0627\u0629. \u062A\u064F\u0641\u0635\u0644 \u0627\u0644\u0633\u064A\u0627\u0633\u0627\u062A \u0627\u0644\u0645\u0642\u062A\u0631\u062D\u0629."
    },
    "exclusionSummary": {
      "en": "Draft and cancelled documents are excluded.",
      "ar": "\u062A\u064F\u0633\u062A\u0628\u0639\u062F \u0627\u0644\u0645\u0633\u0648\u062F\u0627\u062A \u0648\u0627\u0644\u0645\u0633\u062A\u0646\u062F\u0627\u062A \u0627\u0644\u0645\u0644\u063A\u0627\u0629."
    },
    "dateBasis": {
      "en": "Document invoice date; each refund uses its own issue date.",
      "ar": "\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629\u061B \u0643\u0644 \u0625\u0634\u0639\u0627\u0631 \u062F\u0627\u0626\u0646 \u064A\u064F\u062D\u062A\u0633\u0628 \u0628\u062A\u0627\u0631\u064A\u062E \u0625\u0635\u062F\u0627\u0631\u0647."
    },
    "refundCreditBehavior": {
      "en": "Posted refunds reduce net invoiced revenue on their own invoice date. Refund Value shows their positive magnitude. Order metrics remain separate.",
      "ar": "\u062A\u064F\u062E\u0641\u0636 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0627\u0644\u062F\u0627\u0626\u0646\u0629 \u0627\u0644\u0645\u064F\u0631\u062D\u0651\u0644\u0629 \u0635\u0627\u0641\u064A \u0625\u064A\u0631\u0627\u062F\u0627\u062A \u0627\u0644\u0641\u0648\u0627\u062A\u064A\u0631 \u0628\u062A\u0627\u0631\u064A\u062E\u0647\u0627. \u0642\u064A\u0645\u0629 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u062A\u0639\u0631\u0636 \u0645\u0642\u062F\u0627\u0631\u0647\u0627 \u0627\u0644\u0645\u0648\u062C\u0628. \u0645\u0624\u0634\u0631\u0627\u062A \u0627\u0644\u0637\u0644\u0628\u0627\u062A \u0645\u0633\u062A\u0642\u0644\u0629."
    },
    "aggregationBehavior": {
      "en": "Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances.",
      "ar": "\u062A\u064F\u062C\u0645\u0639 \u0627\u0644\u0645\u0633\u0627\u0647\u0645\u0627\u062A \u0627\u0644\u0645\u0624\u0647\u0644\u0629 \u0639\u0644\u0649 \u0627\u0644\u0645\u0633\u062A\u0648\u0649 \u0627\u0644\u0645\u062D\u062F\u062F\u061B \u0627\u0644\u0646\u0633\u0628 \u0645\u0646 \u0625\u062C\u0645\u0627\u0644\u064A\u064A\u0646 \u0645\u062A\u0637\u0627\u0628\u0642\u064A\u0646\u060C \u0648\u0627\u0644\u0639\u062F\u0651 \u0627\u0644\u0645\u0645\u064A\u0632 \u064A\u0632\u064A\u0644 \u062A\u0643\u0631\u0627\u0631 \u0627\u0644\u0647\u0648\u064A\u0627\u062A\u060C \u0648\u0627\u0644\u0645\u062F\u062F \u062A\u062D\u062A\u0627\u062C \u0642\u0627\u0639\u062F\u0629 \u062A\u0631\u062C\u064A\u062D \u0645\u0639\u062A\u0645\u062F\u0629. \u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u062A\u062E\u062A\u0627\u0631 \u062D\u0627\u0644\u0629 \u0648\u0627\u062D\u062F\u0629 \u0644\u0643\u0644 \u0647\u0648\u064A\u0629 \u0639\u0646\u062F \u0627\u0644\u0642\u0637\u0639 \u0648\u062A\u064F\u062C\u0645\u0639 \u0639\u0628\u0631 \u0627\u0644\u0647\u0648\u064A\u0627\u062A \u0641\u0642\u0637. \u0644\u0627 \u062A\u064F\u062C\u0645\u0639 \u0627\u0644\u0646\u0633\u0628 \u0623\u0648 \u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u064A\u0648\u0645\u064A\u0629."
    },
    "definitionVersion": 1
  },
  "units_sold": {
    "shortDefinition": {
      "en": "signed posted product-line quantity normalized within UOM category",
      "ar": "\u0635\u0627\u0641\u064A \u0643\u0645\u064A\u0627\u062A \u0633\u0637\u0648\u0631 \u0627\u0644\u0645\u0646\u062A\u062C\u0627\u062A \u0627\u0644\u0645\u064F\u0631\u062D\u0651\u0644\u0629 \u0628\u0639\u062F \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0627\u0644\u062F\u0627\u0626\u0646\u0629 \u0648\u062A\u0648\u062D\u064A\u062F \u0648\u062D\u062F\u0627\u062A \u0627\u0644\u0642\u064A\u0627\u0633 \u062F\u0627\u062E\u0644 \u0627\u0644\u0641\u0626\u0629"
    },
    "definition": {
      "en": "signed posted product-line quantity normalized within UOM category",
      "ar": "\u0635\u0627\u0641\u064A \u0643\u0645\u064A\u0627\u062A \u0633\u0637\u0648\u0631 \u0627\u0644\u0645\u0646\u062A\u062C\u0627\u062A \u0627\u0644\u0645\u064F\u0631\u062D\u0651\u0644\u0629 \u0628\u0639\u062F \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0627\u0644\u062F\u0627\u0626\u0646\u0629 \u0648\u062A\u0648\u062D\u064A\u062F \u0648\u062D\u062F\u0627\u062A \u0627\u0644\u0642\u064A\u0627\u0633 \u062F\u0627\u062E\u0644 \u0627\u0644\u0641\u0626\u0629"
    },
    "formula": {
      "en": "signed posted product-line quantity normalized within UOM category",
      "ar": "\u0635\u0627\u0641\u064A \u0643\u0645\u064A\u0627\u062A \u0633\u0637\u0648\u0631 \u0627\u0644\u0645\u0646\u062A\u062C\u0627\u062A \u0627\u0644\u0645\u064F\u0631\u062D\u0651\u0644\u0629 \u0628\u0639\u062F \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0627\u0644\u062F\u0627\u0626\u0646\u0629 \u0648\u062A\u0648\u062D\u064A\u062F \u0648\u062D\u062F\u0627\u062A \u0627\u0644\u0642\u064A\u0627\u0633 \u062F\u0627\u062E\u0644 \u0627\u0644\u0641\u0626\u0629"
    },
    "inclusionSummary": {
      "en": "Eligible posted customer product lines, separating credit notes; service, display, downpayment and rounding scope must reconcile to headers.",
      "ar": "\u0633\u0637\u0648\u0631 \u0645\u0646\u062A\u062C\u0627\u062A \u0641\u0648\u0627\u062A\u064A\u0631 \u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0627\u0644\u0645\u064F\u0631\u062D\u0651\u0644\u0629 \u0645\u0639 \u0641\u0635\u0644 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0627\u0644\u062F\u0627\u0626\u0646\u0629\u061B \u064A\u0644\u0632\u0645 \u0645\u0637\u0627\u0628\u0642\u0629 \u0646\u0637\u0627\u0642 \u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0648\u0627\u0644\u0639\u0631\u0636 \u0648\u0627\u0644\u062F\u0641\u0639\u0627\u062A \u0627\u0644\u0645\u0642\u062F\u0645\u0629 \u0648\u0627\u0644\u062A\u0642\u0631\u064A\u0628 \u0645\u0639 \u0631\u0623\u0633 \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629."
    },
    "exclusionSummary": {
      "en": "Draft and cancelled documents are excluded.",
      "ar": "\u062A\u064F\u0633\u062A\u0628\u0639\u062F \u0627\u0644\u0645\u0633\u0648\u062F\u0627\u062A \u0648\u0627\u0644\u0645\u0633\u062A\u0646\u062F\u0627\u062A \u0627\u0644\u0645\u0644\u063A\u0627\u0629."
    },
    "dateBasis": {
      "en": "Document invoice date; each refund uses its own issue date.",
      "ar": "\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629\u061B \u0643\u0644 \u0625\u0634\u0639\u0627\u0631 \u062F\u0627\u0626\u0646 \u064A\u064F\u062D\u062A\u0633\u0628 \u0628\u062A\u0627\u0631\u064A\u062E \u0625\u0635\u062F\u0627\u0631\u0647."
    },
    "refundCreditBehavior": {
      "en": "Posted refunds reduce net invoiced revenue on their own invoice date. Refund Value shows their positive magnitude. Order metrics remain separate.",
      "ar": "\u062A\u064F\u062E\u0641\u0636 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0627\u0644\u062F\u0627\u0626\u0646\u0629 \u0627\u0644\u0645\u064F\u0631\u062D\u0651\u0644\u0629 \u0635\u0627\u0641\u064A \u0625\u064A\u0631\u0627\u062F\u0627\u062A \u0627\u0644\u0641\u0648\u0627\u062A\u064A\u0631 \u0628\u062A\u0627\u0631\u064A\u062E\u0647\u0627. \u0642\u064A\u0645\u0629 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u062A\u0639\u0631\u0636 \u0645\u0642\u062F\u0627\u0631\u0647\u0627 \u0627\u0644\u0645\u0648\u062C\u0628. \u0645\u0624\u0634\u0631\u0627\u062A \u0627\u0644\u0637\u0644\u0628\u0627\u062A \u0645\u0633\u062A\u0642\u0644\u0629."
    },
    "aggregationBehavior": {
      "en": "Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances.",
      "ar": "\u062A\u064F\u062C\u0645\u0639 \u0627\u0644\u0645\u0633\u0627\u0647\u0645\u0627\u062A \u0627\u0644\u0645\u0624\u0647\u0644\u0629 \u0639\u0644\u0649 \u0627\u0644\u0645\u0633\u062A\u0648\u0649 \u0627\u0644\u0645\u062D\u062F\u062F\u061B \u0627\u0644\u0646\u0633\u0628 \u0645\u0646 \u0625\u062C\u0645\u0627\u0644\u064A\u064A\u0646 \u0645\u062A\u0637\u0627\u0628\u0642\u064A\u0646\u060C \u0648\u0627\u0644\u0639\u062F\u0651 \u0627\u0644\u0645\u0645\u064A\u0632 \u064A\u0632\u064A\u0644 \u062A\u0643\u0631\u0627\u0631 \u0627\u0644\u0647\u0648\u064A\u0627\u062A\u060C \u0648\u0627\u0644\u0645\u062F\u062F \u062A\u062D\u062A\u0627\u062C \u0642\u0627\u0639\u062F\u0629 \u062A\u0631\u062C\u064A\u062D \u0645\u0639\u062A\u0645\u062F\u0629. \u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u062A\u062E\u062A\u0627\u0631 \u062D\u0627\u0644\u0629 \u0648\u0627\u062D\u062F\u0629 \u0644\u0643\u0644 \u0647\u0648\u064A\u0629 \u0639\u0646\u062F \u0627\u0644\u0642\u0637\u0639 \u0648\u062A\u064F\u062C\u0645\u0639 \u0639\u0628\u0631 \u0627\u0644\u0647\u0648\u064A\u0627\u062A \u0641\u0642\u0637. \u0644\u0627 \u062A\u064F\u062C\u0645\u0639 \u0627\u0644\u0646\u0633\u0628 \u0623\u0648 \u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u064A\u0648\u0645\u064A\u0629."
    },
    "definitionVersion": 1
  },
  "stock_on_hand": {
    "shortDefinition": {
      "en": "sum current internal-location quants by compatible base UOM",
      "ar": "\u0645\u062C\u0645\u0648\u0639 \u0643\u0645\u064A\u0627\u062A \u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u0645\u0648\u0627\u0642\u0639 \u0627\u0644\u062F\u0627\u062E\u0644\u064A\u0629 \u0641\u064A \u0644\u062D\u0638\u0629 \u0627\u0644\u0645\u0634\u0627\u0647\u062F\u0629 \u0628\u0648\u062D\u062F\u0627\u062A \u0645\u062A\u0648\u0627\u0641\u0642\u0629\u061B \u062A\u064F\u062D\u0641\u0638 \u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u0633\u0627\u0644\u0628\u0629 \u0648\u0644\u0627 \u062A\u064F\u0635\u0641\u0651\u0631"
    },
    "definition": {
      "en": "sum current internal-location quants by compatible base UOM",
      "ar": "\u0645\u062C\u0645\u0648\u0639 \u0643\u0645\u064A\u0627\u062A \u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u0645\u0648\u0627\u0642\u0639 \u0627\u0644\u062F\u0627\u062E\u0644\u064A\u0629 \u0641\u064A \u0644\u062D\u0638\u0629 \u0627\u0644\u0645\u0634\u0627\u0647\u062F\u0629 \u0628\u0648\u062D\u062F\u0627\u062A \u0645\u062A\u0648\u0627\u0641\u0642\u0629\u061B \u062A\u064F\u062D\u0641\u0638 \u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u0633\u0627\u0644\u0628\u0629 \u0648\u0644\u0627 \u062A\u064F\u0635\u0641\u0651\u0631"
    },
    "formula": {
      "en": "sum current internal-location quants by compatible base UOM",
      "ar": "\u0645\u062C\u0645\u0648\u0639 \u0643\u0645\u064A\u0627\u062A \u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u0645\u0648\u0627\u0642\u0639 \u0627\u0644\u062F\u0627\u062E\u0644\u064A\u0629 \u0641\u064A \u0644\u062D\u0638\u0629 \u0627\u0644\u0645\u0634\u0627\u0647\u062F\u0629 \u0628\u0648\u062D\u062F\u0627\u062A \u0645\u062A\u0648\u0627\u0641\u0642\u0629\u061B \u062A\u064F\u062D\u0641\u0638 \u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u0633\u0627\u0644\u0628\u0629 \u0648\u0644\u0627 \u062A\u064F\u0635\u0641\u0651\u0631"
    },
    "inclusionSummary": {
      "en": "Current internal positions; owner/consignment and location hierarchy require approval. Keep negative positions visible. Movements are a separate event measure.",
      "ar": "\u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u0645\u0648\u0627\u0642\u0639 \u0627\u0644\u062F\u0627\u062E\u0644\u064A\u0629 \u0627\u0644\u062D\u0627\u0644\u064A\u0629\u061B \u0627\u0644\u0645\u0644\u0643\u064A\u0629 \u0648\u0627\u0644\u0628\u0636\u0627\u0639\u0629 \u0628\u0627\u0644\u0623\u0645\u0627\u0646\u0629 \u0648\u062A\u0633\u0644\u0633\u0644 \u0627\u0644\u0645\u0648\u0627\u0642\u0639 \u062A\u062D\u062A\u0627\u062C \u0627\u0639\u062A\u0645\u0627\u062F\u0627\u064B. \u062A\u0628\u0642\u0649 \u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u0633\u0627\u0644\u0628\u0629 \u0638\u0627\u0647\u0631\u0629. \u0627\u0644\u062D\u0631\u0643\u0627\u062A \u0645\u0624\u0634\u0631 \u0623\u062D\u062F\u0627\u062B \u0645\u0646\u0641\u0635\u0644."
    },
    "exclusionSummary": {
      "en": "Draft and cancelled documents are excluded.",
      "ar": "\u062A\u064F\u0633\u062A\u0628\u0639\u062F \u0627\u0644\u0645\u0633\u0648\u062F\u0627\u062A \u0648\u0627\u0644\u0645\u0633\u062A\u0646\u062F\u0627\u062A \u0627\u0644\u0645\u0644\u063A\u0627\u0629."
    },
    "dateBasis": {
      "en": "Document invoice date; each refund uses its own issue date.",
      "ar": "\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629\u061B \u0643\u0644 \u0625\u0634\u0639\u0627\u0631 \u062F\u0627\u0626\u0646 \u064A\u064F\u062D\u062A\u0633\u0628 \u0628\u062A\u0627\u0631\u064A\u062E \u0625\u0635\u062F\u0627\u0631\u0647."
    },
    "refundCreditBehavior": {
      "en": "Posted refunds reduce net invoiced revenue on their own invoice date. Refund Value shows their positive magnitude. Order metrics remain separate.",
      "ar": "\u062A\u064F\u062E\u0641\u0636 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0627\u0644\u062F\u0627\u0626\u0646\u0629 \u0627\u0644\u0645\u064F\u0631\u062D\u0651\u0644\u0629 \u0635\u0627\u0641\u064A \u0625\u064A\u0631\u0627\u062F\u0627\u062A \u0627\u0644\u0641\u0648\u0627\u062A\u064A\u0631 \u0628\u062A\u0627\u0631\u064A\u062E\u0647\u0627. \u0642\u064A\u0645\u0629 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u062A\u0639\u0631\u0636 \u0645\u0642\u062F\u0627\u0631\u0647\u0627 \u0627\u0644\u0645\u0648\u062C\u0628. \u0645\u0624\u0634\u0631\u0627\u062A \u0627\u0644\u0637\u0644\u0628\u0627\u062A \u0645\u0633\u062A\u0642\u0644\u0629."
    },
    "aggregationBehavior": {
      "en": "Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances.",
      "ar": "\u062A\u064F\u062C\u0645\u0639 \u0627\u0644\u0645\u0633\u0627\u0647\u0645\u0627\u062A \u0627\u0644\u0645\u0624\u0647\u0644\u0629 \u0639\u0644\u0649 \u0627\u0644\u0645\u0633\u062A\u0648\u0649 \u0627\u0644\u0645\u062D\u062F\u062F\u061B \u0627\u0644\u0646\u0633\u0628 \u0645\u0646 \u0625\u062C\u0645\u0627\u0644\u064A\u064A\u0646 \u0645\u062A\u0637\u0627\u0628\u0642\u064A\u0646\u060C \u0648\u0627\u0644\u0639\u062F\u0651 \u0627\u0644\u0645\u0645\u064A\u0632 \u064A\u0632\u064A\u0644 \u062A\u0643\u0631\u0627\u0631 \u0627\u0644\u0647\u0648\u064A\u0627\u062A\u060C \u0648\u0627\u0644\u0645\u062F\u062F \u062A\u062D\u062A\u0627\u062C \u0642\u0627\u0639\u062F\u0629 \u062A\u0631\u062C\u064A\u062D \u0645\u0639\u062A\u0645\u062F\u0629. \u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u062A\u062E\u062A\u0627\u0631 \u062D\u0627\u0644\u0629 \u0648\u0627\u062D\u062F\u0629 \u0644\u0643\u0644 \u0647\u0648\u064A\u0629 \u0639\u0646\u062F \u0627\u0644\u0642\u0637\u0639 \u0648\u062A\u064F\u062C\u0645\u0639 \u0639\u0628\u0631 \u0627\u0644\u0647\u0648\u064A\u0627\u062A \u0641\u0642\u0637. \u0644\u0627 \u062A\u064F\u062C\u0645\u0639 \u0627\u0644\u0646\u0633\u0628 \u0623\u0648 \u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u064A\u0648\u0645\u064A\u0629."
    },
    "definitionVersion": 1
  },
  "inventory_value": {
    "shortDefinition": {
      "en": "approved current layer valuation reconciled to stock/accounting",
      "ar": "\u062A\u0642\u064A\u064A\u0645 \u0627\u0644\u0645\u062E\u0632\u0648\u0646 \u0627\u0644\u062D\u0627\u0644\u064A \u0648\u0641\u0642 \u0637\u0628\u0642\u0627\u062A \u062A\u0643\u0644\u0641\u0629 \u0645\u0639\u062A\u0645\u062F\u0629 \u0648\u0645\u0637\u0627\u0628\u0642\u0629 \u0644\u0644\u0645\u062D\u0627\u0633\u0628\u0629\u061B \u0644\u064A\u0633 \u0635\u0627\u0641\u064A \u062D\u0631\u0643\u0627\u062A \u0627\u0644\u062A\u0642\u064A\u064A\u0645 \u0644\u0634\u0647\u0631 \u0648\u0627\u062D\u062F"
    },
    "definition": {
      "en": "approved current layer valuation reconciled to stock/accounting",
      "ar": "\u062A\u0642\u064A\u064A\u0645 \u0627\u0644\u0645\u062E\u0632\u0648\u0646 \u0627\u0644\u062D\u0627\u0644\u064A \u0648\u0641\u0642 \u0637\u0628\u0642\u0627\u062A \u062A\u0643\u0644\u0641\u0629 \u0645\u0639\u062A\u0645\u062F\u0629 \u0648\u0645\u0637\u0627\u0628\u0642\u0629 \u0644\u0644\u0645\u062D\u0627\u0633\u0628\u0629\u061B \u0644\u064A\u0633 \u0635\u0627\u0641\u064A \u062D\u0631\u0643\u0627\u062A \u0627\u0644\u062A\u0642\u064A\u064A\u0645 \u0644\u0634\u0647\u0631 \u0648\u0627\u062D\u062F"
    },
    "formula": {
      "en": "approved current layer valuation reconciled to stock/accounting",
      "ar": "\u062A\u0642\u064A\u064A\u0645 \u0627\u0644\u0645\u062E\u0632\u0648\u0646 \u0627\u0644\u062D\u0627\u0644\u064A \u0648\u0641\u0642 \u0637\u0628\u0642\u0627\u062A \u062A\u0643\u0644\u0641\u0629 \u0645\u0639\u062A\u0645\u062F\u0629 \u0648\u0645\u0637\u0627\u0628\u0642\u0629 \u0644\u0644\u0645\u062D\u0627\u0633\u0628\u0629\u061B \u0644\u064A\u0633 \u0635\u0627\u0641\u064A \u062D\u0631\u0643\u0627\u062A \u0627\u0644\u062A\u0642\u064A\u064A\u0645 \u0644\u0634\u0647\u0631 \u0648\u0627\u062D\u062F"
    },
    "inclusionSummary": {
      "en": "Current internal positions; owner/consignment and location hierarchy require approval. Keep negative positions visible. Movements are a separate event measure.",
      "ar": "\u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u0645\u0648\u0627\u0642\u0639 \u0627\u0644\u062F\u0627\u062E\u0644\u064A\u0629 \u0627\u0644\u062D\u0627\u0644\u064A\u0629\u061B \u0627\u0644\u0645\u0644\u0643\u064A\u0629 \u0648\u0627\u0644\u0628\u0636\u0627\u0639\u0629 \u0628\u0627\u0644\u0623\u0645\u0627\u0646\u0629 \u0648\u062A\u0633\u0644\u0633\u0644 \u0627\u0644\u0645\u0648\u0627\u0642\u0639 \u062A\u062D\u062A\u0627\u062C \u0627\u0639\u062A\u0645\u0627\u062F\u0627\u064B. \u062A\u0628\u0642\u0649 \u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u0633\u0627\u0644\u0628\u0629 \u0638\u0627\u0647\u0631\u0629. \u0627\u0644\u062D\u0631\u0643\u0627\u062A \u0645\u0624\u0634\u0631 \u0623\u062D\u062F\u0627\u062B \u0645\u0646\u0641\u0635\u0644."
    },
    "exclusionSummary": {
      "en": "Draft and cancelled documents are excluded.",
      "ar": "\u062A\u064F\u0633\u062A\u0628\u0639\u062F \u0627\u0644\u0645\u0633\u0648\u062F\u0627\u062A \u0648\u0627\u0644\u0645\u0633\u062A\u0646\u062F\u0627\u062A \u0627\u0644\u0645\u0644\u063A\u0627\u0629."
    },
    "dateBasis": {
      "en": "Document invoice date; each refund uses its own issue date.",
      "ar": "\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629\u061B \u0643\u0644 \u0625\u0634\u0639\u0627\u0631 \u062F\u0627\u0626\u0646 \u064A\u064F\u062D\u062A\u0633\u0628 \u0628\u062A\u0627\u0631\u064A\u062E \u0625\u0635\u062F\u0627\u0631\u0647."
    },
    "refundCreditBehavior": {
      "en": "Posted refunds reduce net invoiced revenue on their own invoice date. Refund Value shows their positive magnitude. Order metrics remain separate.",
      "ar": "\u062A\u064F\u062E\u0641\u0636 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0627\u0644\u062F\u0627\u0626\u0646\u0629 \u0627\u0644\u0645\u064F\u0631\u062D\u0651\u0644\u0629 \u0635\u0627\u0641\u064A \u0625\u064A\u0631\u0627\u062F\u0627\u062A \u0627\u0644\u0641\u0648\u0627\u062A\u064A\u0631 \u0628\u062A\u0627\u0631\u064A\u062E\u0647\u0627. \u0642\u064A\u0645\u0629 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u062A\u0639\u0631\u0636 \u0645\u0642\u062F\u0627\u0631\u0647\u0627 \u0627\u0644\u0645\u0648\u062C\u0628. \u0645\u0624\u0634\u0631\u0627\u062A \u0627\u0644\u0637\u0644\u0628\u0627\u062A \u0645\u0633\u062A\u0642\u0644\u0629."
    },
    "aggregationBehavior": {
      "en": "Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances.",
      "ar": "\u062A\u064F\u062C\u0645\u0639 \u0627\u0644\u0645\u0633\u0627\u0647\u0645\u0627\u062A \u0627\u0644\u0645\u0624\u0647\u0644\u0629 \u0639\u0644\u0649 \u0627\u0644\u0645\u0633\u062A\u0648\u0649 \u0627\u0644\u0645\u062D\u062F\u062F\u061B \u0627\u0644\u0646\u0633\u0628 \u0645\u0646 \u0625\u062C\u0645\u0627\u0644\u064A\u064A\u0646 \u0645\u062A\u0637\u0627\u0628\u0642\u064A\u0646\u060C \u0648\u0627\u0644\u0639\u062F\u0651 \u0627\u0644\u0645\u0645\u064A\u0632 \u064A\u0632\u064A\u0644 \u062A\u0643\u0631\u0627\u0631 \u0627\u0644\u0647\u0648\u064A\u0627\u062A\u060C \u0648\u0627\u0644\u0645\u062F\u062F \u062A\u062D\u062A\u0627\u062C \u0642\u0627\u0639\u062F\u0629 \u062A\u0631\u062C\u064A\u062D \u0645\u0639\u062A\u0645\u062F\u0629. \u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u062A\u062E\u062A\u0627\u0631 \u062D\u0627\u0644\u0629 \u0648\u0627\u062D\u062F\u0629 \u0644\u0643\u0644 \u0647\u0648\u064A\u0629 \u0639\u0646\u062F \u0627\u0644\u0642\u0637\u0639 \u0648\u062A\u064F\u062C\u0645\u0639 \u0639\u0628\u0631 \u0627\u0644\u0647\u0648\u064A\u0627\u062A \u0641\u0642\u0637. \u0644\u0627 \u062A\u064F\u062C\u0645\u0639 \u0627\u0644\u0646\u0633\u0628 \u0623\u0648 \u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u064A\u0648\u0645\u064A\u0629."
    },
    "definitionVersion": 1
  },
  "opportunity_count": {
    "shortDefinition": {
      "en": "count opportunities",
      "ar": "\u0639\u062F\u062F \u0627\u0644\u0641\u0631\u0635 \u0627\u0644\u0628\u064A\u0639\u064A\u0629 \u0627\u0644\u0645\u0624\u0647\u0644\u0629 \u0636\u0645\u0646 \u062D\u0627\u0644\u0627\u062A \u0645\u0639\u062A\u0645\u062F\u0629\u061B \u0627\u0644\u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0627\u0644\u062D\u0627\u0644\u064A \u063A\u064A\u0631 \u0643\u0627\u0641\u064D"
    },
    "definition": {
      "en": "count opportunities",
      "ar": "\u0639\u062F\u062F \u0627\u0644\u0641\u0631\u0635 \u0627\u0644\u0628\u064A\u0639\u064A\u0629 \u0627\u0644\u0645\u0624\u0647\u0644\u0629 \u0636\u0645\u0646 \u062D\u0627\u0644\u0627\u062A \u0645\u0639\u062A\u0645\u062F\u0629\u061B \u0627\u0644\u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0627\u0644\u062D\u0627\u0644\u064A \u063A\u064A\u0631 \u0643\u0627\u0641\u064D"
    },
    "formula": {
      "en": "count opportunities",
      "ar": "\u0639\u062F\u062F \u0627\u0644\u0641\u0631\u0635 \u0627\u0644\u0628\u064A\u0639\u064A\u0629 \u0627\u0644\u0645\u0624\u0647\u0644\u0629 \u0636\u0645\u0646 \u062D\u0627\u0644\u0627\u062A \u0645\u0639\u062A\u0645\u062F\u0629\u061B \u0627\u0644\u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0627\u0644\u062D\u0627\u0644\u064A \u063A\u064A\u0631 \u0643\u0627\u0641\u064D"
    },
    "inclusionSummary": {
      "en": "Eligible opportunity stages and active/closed population require owner definitions; one inactive opportunity cannot support a reliable pipeline.",
      "ar": "\u0645\u0631\u0627\u062D\u0644 \u0627\u0644\u0641\u0631\u0635 \u0648\u0645\u062C\u0645\u0648\u0639\u0627\u062A \u0627\u0644\u0646\u0634\u0627\u0637 \u0648\u0627\u0644\u0625\u063A\u0644\u0627\u0642 \u062A\u062D\u062A\u0627\u062C \u062A\u0639\u0631\u064A\u0641 \u0627\u0644\u0645\u0627\u0644\u0643\u061B \u0641\u0631\u0635\u0629 \u0648\u0627\u062D\u062F\u0629 \u063A\u064A\u0631 \u0646\u0634\u0637\u0629 \u0644\u0627 \u062A\u062F\u0639\u0645 \u062A\u062D\u0644\u064A\u0644\u0627\u064B \u0645\u0648\u062B\u0648\u0642\u0627\u064B."
    },
    "exclusionSummary": {
      "en": "Draft and cancelled documents are excluded.",
      "ar": "\u062A\u064F\u0633\u062A\u0628\u0639\u062F \u0627\u0644\u0645\u0633\u0648\u062F\u0627\u062A \u0648\u0627\u0644\u0645\u0633\u062A\u0646\u062F\u0627\u062A \u0627\u0644\u0645\u0644\u063A\u0627\u0629."
    },
    "dateBasis": {
      "en": "Document invoice date; each refund uses its own issue date.",
      "ar": "\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629\u061B \u0643\u0644 \u0625\u0634\u0639\u0627\u0631 \u062F\u0627\u0626\u0646 \u064A\u064F\u062D\u062A\u0633\u0628 \u0628\u062A\u0627\u0631\u064A\u062E \u0625\u0635\u062F\u0627\u0631\u0647."
    },
    "refundCreditBehavior": {
      "en": "Posted refunds reduce net invoiced revenue on their own invoice date. Refund Value shows their positive magnitude. Order metrics remain separate.",
      "ar": "\u062A\u064F\u062E\u0641\u0636 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0627\u0644\u062F\u0627\u0626\u0646\u0629 \u0627\u0644\u0645\u064F\u0631\u062D\u0651\u0644\u0629 \u0635\u0627\u0641\u064A \u0625\u064A\u0631\u0627\u062F\u0627\u062A \u0627\u0644\u0641\u0648\u0627\u062A\u064A\u0631 \u0628\u062A\u0627\u0631\u064A\u062E\u0647\u0627. \u0642\u064A\u0645\u0629 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u062A\u0639\u0631\u0636 \u0645\u0642\u062F\u0627\u0631\u0647\u0627 \u0627\u0644\u0645\u0648\u062C\u0628. \u0645\u0624\u0634\u0631\u0627\u062A \u0627\u0644\u0637\u0644\u0628\u0627\u062A \u0645\u0633\u062A\u0642\u0644\u0629."
    },
    "aggregationBehavior": {
      "en": "Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances.",
      "ar": "\u062A\u064F\u062C\u0645\u0639 \u0627\u0644\u0645\u0633\u0627\u0647\u0645\u0627\u062A \u0627\u0644\u0645\u0624\u0647\u0644\u0629 \u0639\u0644\u0649 \u0627\u0644\u0645\u0633\u062A\u0648\u0649 \u0627\u0644\u0645\u062D\u062F\u062F\u061B \u0627\u0644\u0646\u0633\u0628 \u0645\u0646 \u0625\u062C\u0645\u0627\u0644\u064A\u064A\u0646 \u0645\u062A\u0637\u0627\u0628\u0642\u064A\u0646\u060C \u0648\u0627\u0644\u0639\u062F\u0651 \u0627\u0644\u0645\u0645\u064A\u0632 \u064A\u0632\u064A\u0644 \u062A\u0643\u0631\u0627\u0631 \u0627\u0644\u0647\u0648\u064A\u0627\u062A\u060C \u0648\u0627\u0644\u0645\u062F\u062F \u062A\u062D\u062A\u0627\u062C \u0642\u0627\u0639\u062F\u0629 \u062A\u0631\u062C\u064A\u062D \u0645\u0639\u062A\u0645\u062F\u0629. \u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u062A\u062E\u062A\u0627\u0631 \u062D\u0627\u0644\u0629 \u0648\u0627\u062D\u062F\u0629 \u0644\u0643\u0644 \u0647\u0648\u064A\u0629 \u0639\u0646\u062F \u0627\u0644\u0642\u0637\u0639 \u0648\u062A\u064F\u062C\u0645\u0639 \u0639\u0628\u0631 \u0627\u0644\u0647\u0648\u064A\u0627\u062A \u0641\u0642\u0637. \u0644\u0627 \u062A\u064F\u062C\u0645\u0639 \u0627\u0644\u0646\u0633\u0628 \u0623\u0648 \u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u064A\u0648\u0645\u064A\u0629."
    },
    "definitionVersion": 1
  },
  "win_rate": {
    "shortDefinition": {
      "en": "won / approved closed opportunity cohort",
      "ar": "\u0627\u0644\u0641\u0631\u0635 \u0627\u0644\u0645\u062D\u0642\u0642\u0629 \xF7 \u0645\u062C\u0645\u0648\u0639\u0629 \u0627\u0644\u0641\u0631\u0635 \u0627\u0644\u0645\u063A\u0644\u0642\u0629 \u0627\u0644\u0645\u0639\u062A\u0645\u062F\u0629 \xD7 100"
    },
    "definition": {
      "en": "won / approved closed opportunity cohort",
      "ar": "\u0627\u0644\u0641\u0631\u0635 \u0627\u0644\u0645\u062D\u0642\u0642\u0629 \xF7 \u0645\u062C\u0645\u0648\u0639\u0629 \u0627\u0644\u0641\u0631\u0635 \u0627\u0644\u0645\u063A\u0644\u0642\u0629 \u0627\u0644\u0645\u0639\u062A\u0645\u062F\u0629 \xD7 100"
    },
    "formula": {
      "en": "won / approved closed opportunity cohort",
      "ar": "\u0627\u0644\u0641\u0631\u0635 \u0627\u0644\u0645\u062D\u0642\u0642\u0629 \xF7 \u0645\u062C\u0645\u0648\u0639\u0629 \u0627\u0644\u0641\u0631\u0635 \u0627\u0644\u0645\u063A\u0644\u0642\u0629 \u0627\u0644\u0645\u0639\u062A\u0645\u062F\u0629 \xD7 100"
    },
    "inclusionSummary": {
      "en": "Eligible opportunity stages and active/closed population require owner definitions; one inactive opportunity cannot support a reliable pipeline.",
      "ar": "\u0645\u0631\u0627\u062D\u0644 \u0627\u0644\u0641\u0631\u0635 \u0648\u0645\u062C\u0645\u0648\u0639\u0627\u062A \u0627\u0644\u0646\u0634\u0627\u0637 \u0648\u0627\u0644\u0625\u063A\u0644\u0627\u0642 \u062A\u062D\u062A\u0627\u062C \u062A\u0639\u0631\u064A\u0641 \u0627\u0644\u0645\u0627\u0644\u0643\u061B \u0641\u0631\u0635\u0629 \u0648\u0627\u062D\u062F\u0629 \u063A\u064A\u0631 \u0646\u0634\u0637\u0629 \u0644\u0627 \u062A\u062F\u0639\u0645 \u062A\u062D\u0644\u064A\u0644\u0627\u064B \u0645\u0648\u062B\u0648\u0642\u0627\u064B."
    },
    "exclusionSummary": {
      "en": "Draft and cancelled documents are excluded.",
      "ar": "\u062A\u064F\u0633\u062A\u0628\u0639\u062F \u0627\u0644\u0645\u0633\u0648\u062F\u0627\u062A \u0648\u0627\u0644\u0645\u0633\u062A\u0646\u062F\u0627\u062A \u0627\u0644\u0645\u0644\u063A\u0627\u0629."
    },
    "dateBasis": {
      "en": "Document invoice date; each refund uses its own issue date.",
      "ar": "\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629\u061B \u0643\u0644 \u0625\u0634\u0639\u0627\u0631 \u062F\u0627\u0626\u0646 \u064A\u064F\u062D\u062A\u0633\u0628 \u0628\u062A\u0627\u0631\u064A\u062E \u0625\u0635\u062F\u0627\u0631\u0647."
    },
    "refundCreditBehavior": {
      "en": "Posted refunds reduce net invoiced revenue on their own invoice date. Refund Value shows their positive magnitude. Order metrics remain separate.",
      "ar": "\u062A\u064F\u062E\u0641\u0636 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0627\u0644\u062F\u0627\u0626\u0646\u0629 \u0627\u0644\u0645\u064F\u0631\u062D\u0651\u0644\u0629 \u0635\u0627\u0641\u064A \u0625\u064A\u0631\u0627\u062F\u0627\u062A \u0627\u0644\u0641\u0648\u0627\u062A\u064A\u0631 \u0628\u062A\u0627\u0631\u064A\u062E\u0647\u0627. \u0642\u064A\u0645\u0629 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u062A\u0639\u0631\u0636 \u0645\u0642\u062F\u0627\u0631\u0647\u0627 \u0627\u0644\u0645\u0648\u062C\u0628. \u0645\u0624\u0634\u0631\u0627\u062A \u0627\u0644\u0637\u0644\u0628\u0627\u062A \u0645\u0633\u062A\u0642\u0644\u0629."
    },
    "aggregationBehavior": {
      "en": "Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances.",
      "ar": "\u062A\u064F\u062C\u0645\u0639 \u0627\u0644\u0645\u0633\u0627\u0647\u0645\u0627\u062A \u0627\u0644\u0645\u0624\u0647\u0644\u0629 \u0639\u0644\u0649 \u0627\u0644\u0645\u0633\u062A\u0648\u0649 \u0627\u0644\u0645\u062D\u062F\u062F\u061B \u0627\u0644\u0646\u0633\u0628 \u0645\u0646 \u0625\u062C\u0645\u0627\u0644\u064A\u064A\u0646 \u0645\u062A\u0637\u0627\u0628\u0642\u064A\u0646\u060C \u0648\u0627\u0644\u0639\u062F\u0651 \u0627\u0644\u0645\u0645\u064A\u0632 \u064A\u0632\u064A\u0644 \u062A\u0643\u0631\u0627\u0631 \u0627\u0644\u0647\u0648\u064A\u0627\u062A\u060C \u0648\u0627\u0644\u0645\u062F\u062F \u062A\u062D\u062A\u0627\u062C \u0642\u0627\u0639\u062F\u0629 \u062A\u0631\u062C\u064A\u062D \u0645\u0639\u062A\u0645\u062F\u0629. \u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u062A\u062E\u062A\u0627\u0631 \u062D\u0627\u0644\u0629 \u0648\u0627\u062D\u062F\u0629 \u0644\u0643\u0644 \u0647\u0648\u064A\u0629 \u0639\u0646\u062F \u0627\u0644\u0642\u0637\u0639 \u0648\u062A\u064F\u062C\u0645\u0639 \u0639\u0628\u0631 \u0627\u0644\u0647\u0648\u064A\u0627\u062A \u0641\u0642\u0637. \u0644\u0627 \u062A\u064F\u062C\u0645\u0639 \u0627\u0644\u0646\u0633\u0628 \u0623\u0648 \u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u064A\u0648\u0645\u064A\u0629."
    },
    "definitionVersion": 1
  },
  "pipeline_value": {
    "shortDefinition": {
      "en": "sum approved active opportunity expected value",
      "ar": "\u0645\u062C\u0645\u0648\u0639 \u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u0645\u062A\u0648\u0642\u0639\u0629 \u0644\u0644\u0641\u0631\u0635 \u0627\u0644\u0646\u0634\u0637\u0629 \u0627\u0644\u0645\u0624\u0647\u0644\u0629"
    },
    "definition": {
      "en": "sum approved active opportunity expected value",
      "ar": "\u0645\u062C\u0645\u0648\u0639 \u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u0645\u062A\u0648\u0642\u0639\u0629 \u0644\u0644\u0641\u0631\u0635 \u0627\u0644\u0646\u0634\u0637\u0629 \u0627\u0644\u0645\u0624\u0647\u0644\u0629"
    },
    "formula": {
      "en": "sum approved active opportunity expected value",
      "ar": "\u0645\u062C\u0645\u0648\u0639 \u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u0645\u062A\u0648\u0642\u0639\u0629 \u0644\u0644\u0641\u0631\u0635 \u0627\u0644\u0646\u0634\u0637\u0629 \u0627\u0644\u0645\u0624\u0647\u0644\u0629"
    },
    "inclusionSummary": {
      "en": "Eligible opportunity stages and active/closed population require owner definitions; one inactive opportunity cannot support a reliable pipeline.",
      "ar": "\u0645\u0631\u0627\u062D\u0644 \u0627\u0644\u0641\u0631\u0635 \u0648\u0645\u062C\u0645\u0648\u0639\u0627\u062A \u0627\u0644\u0646\u0634\u0627\u0637 \u0648\u0627\u0644\u0625\u063A\u0644\u0627\u0642 \u062A\u062D\u062A\u0627\u062C \u062A\u0639\u0631\u064A\u0641 \u0627\u0644\u0645\u0627\u0644\u0643\u061B \u0641\u0631\u0635\u0629 \u0648\u0627\u062D\u062F\u0629 \u063A\u064A\u0631 \u0646\u0634\u0637\u0629 \u0644\u0627 \u062A\u062F\u0639\u0645 \u062A\u062D\u0644\u064A\u0644\u0627\u064B \u0645\u0648\u062B\u0648\u0642\u0627\u064B."
    },
    "exclusionSummary": {
      "en": "Draft and cancelled documents are excluded.",
      "ar": "\u062A\u064F\u0633\u062A\u0628\u0639\u062F \u0627\u0644\u0645\u0633\u0648\u062F\u0627\u062A \u0648\u0627\u0644\u0645\u0633\u062A\u0646\u062F\u0627\u062A \u0627\u0644\u0645\u0644\u063A\u0627\u0629."
    },
    "dateBasis": {
      "en": "Document invoice date; each refund uses its own issue date.",
      "ar": "\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629\u061B \u0643\u0644 \u0625\u0634\u0639\u0627\u0631 \u062F\u0627\u0626\u0646 \u064A\u064F\u062D\u062A\u0633\u0628 \u0628\u062A\u0627\u0631\u064A\u062E \u0625\u0635\u062F\u0627\u0631\u0647."
    },
    "refundCreditBehavior": {
      "en": "Posted refunds reduce net invoiced revenue on their own invoice date. Refund Value shows their positive magnitude. Order metrics remain separate.",
      "ar": "\u062A\u064F\u062E\u0641\u0636 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0627\u0644\u062F\u0627\u0626\u0646\u0629 \u0627\u0644\u0645\u064F\u0631\u062D\u0651\u0644\u0629 \u0635\u0627\u0641\u064A \u0625\u064A\u0631\u0627\u062F\u0627\u062A \u0627\u0644\u0641\u0648\u0627\u062A\u064A\u0631 \u0628\u062A\u0627\u0631\u064A\u062E\u0647\u0627. \u0642\u064A\u0645\u0629 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u062A\u0639\u0631\u0636 \u0645\u0642\u062F\u0627\u0631\u0647\u0627 \u0627\u0644\u0645\u0648\u062C\u0628. \u0645\u0624\u0634\u0631\u0627\u062A \u0627\u0644\u0637\u0644\u0628\u0627\u062A \u0645\u0633\u062A\u0642\u0644\u0629."
    },
    "aggregationBehavior": {
      "en": "Sum eligible contributions at the named grain; ratios use matching numerator/denominator totals, distinct counts deduplicate identities, durations require an approved weighting rule. Snapshots select one eligible state per stable position at cutoff and sum across positions only. Never sum percentages or daily balances.",
      "ar": "\u062A\u064F\u062C\u0645\u0639 \u0627\u0644\u0645\u0633\u0627\u0647\u0645\u0627\u062A \u0627\u0644\u0645\u0624\u0647\u0644\u0629 \u0639\u0644\u0649 \u0627\u0644\u0645\u0633\u062A\u0648\u0649 \u0627\u0644\u0645\u062D\u062F\u062F\u061B \u0627\u0644\u0646\u0633\u0628 \u0645\u0646 \u0625\u062C\u0645\u0627\u0644\u064A\u064A\u0646 \u0645\u062A\u0637\u0627\u0628\u0642\u064A\u0646\u060C \u0648\u0627\u0644\u0639\u062F\u0651 \u0627\u0644\u0645\u0645\u064A\u0632 \u064A\u0632\u064A\u0644 \u062A\u0643\u0631\u0627\u0631 \u0627\u0644\u0647\u0648\u064A\u0627\u062A\u060C \u0648\u0627\u0644\u0645\u062F\u062F \u062A\u062D\u062A\u0627\u062C \u0642\u0627\u0639\u062F\u0629 \u062A\u0631\u062C\u064A\u062D \u0645\u0639\u062A\u0645\u062F\u0629. \u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u062A\u062E\u062A\u0627\u0631 \u062D\u0627\u0644\u0629 \u0648\u0627\u062D\u062F\u0629 \u0644\u0643\u0644 \u0647\u0648\u064A\u0629 \u0639\u0646\u062F \u0627\u0644\u0642\u0637\u0639 \u0648\u062A\u064F\u062C\u0645\u0639 \u0639\u0628\u0631 \u0627\u0644\u0647\u0648\u064A\u0627\u062A \u0641\u0642\u0637. \u0644\u0627 \u062A\u064F\u062C\u0645\u0639 \u0627\u0644\u0646\u0633\u0628 \u0623\u0648 \u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u064A\u0648\u0645\u064A\u0629."
    },
    "definitionVersion": 1
  },
  "net_aged_receivable": {
    "shortDefinition": {
      "en": "Customer receivables outstanding at cutoff after signed credit balances are netted.",
      "ar": "\u0630\u0645\u0645 \u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0627\u0644\u0642\u0627\u0626\u0645\u0629 \u0639\u0646\u062F \u0627\u0644\u0642\u0637\u0639 \u0628\u0639\u062F \u0627\u062D\u062A\u0633\u0627\u0628 \u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u062F\u0627\u0626\u0646\u0629 \u0628\u0625\u0634\u0627\u0631\u0627\u062A\u0647\u0627."
    },
    "definition": {
      "en": "Customer receivables outstanding at cutoff after signed credit balances are netted. Historical residual is reconstructed through cutoff; payments after cutoff do not change that historical balance.",
      "ar": "\u0630\u0645\u0645 \u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0627\u0644\u0642\u0627\u0626\u0645\u0629 \u0639\u0646\u062F \u0627\u0644\u0642\u0637\u0639 \u0628\u0639\u062F \u0627\u062D\u062A\u0633\u0627\u0628 \u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u062F\u0627\u0626\u0646\u0629 \u0628\u0625\u0634\u0627\u0631\u0627\u062A\u0647\u0627. \u064A\u064F\u0639\u0627\u062F \u0628\u0646\u0627\u0621 \u0627\u0644\u0631\u0635\u064A\u062F \u0627\u0644\u0645\u062A\u0628\u0642\u064A \u062D\u062A\u0649 \u0627\u0644\u0642\u0637\u0639\u061B \u0627\u0644\u062F\u0641\u0639\u0627\u062A \u0627\u0644\u0644\u0627\u062D\u0642\u0629 \u0644\u0627 \u062A\u063A\u064A\u0631 \u0630\u0644\u0643 \u0627\u0644\u0631\u0635\u064A\u062F \u0627\u0644\u062A\u0627\u0631\u064A\u062E\u064A."
    },
    "formula": {
      "en": "At Date + 1\u201330 + 31\u201360 + 61\u201390 + 91\u2013120 + >120 = Gross Open Receivable Components + Credit Balances",
      "ar": "\u0639\u0646\u062F \u0627\u0644\u0642\u0637\u0639 + \u0661\u2013\u0663\u0660 + \u0663\u0661\u2013\u0666\u0660 + \u0666\u0661\u2013\u0669\u0660 + \u0669\u0661\u2013\u0661\u0662\u0660 + \u0623\u0643\u062B\u0631 \u0645\u0646 \u0661\u0662\u0660 = \u0627\u0644\u0645\u0643\u0648\u0646\u0627\u062A \u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A\u0629 + \u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u062F\u0627\u0626\u0646\u0629"
    },
    "inclusionSummary": {
      "en": "Posted customer receivable journal items, including invoice, journal/payment and credit-note balances.",
      "ar": "\u0628\u0646\u0648\u062F \u0627\u0644\u0630\u0645\u0645 \u0627\u0644\u0645\u062F\u064A\u0646\u0629 \u0627\u0644\u0645\u064F\u0631\u062D\u0651\u0644\u0629 \u0644\u0644\u0639\u0645\u0644\u0627\u0621\u060C \u0628\u0645\u0627 \u0641\u064A\u0647\u0627 \u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u0641\u0648\u0627\u062A\u064A\u0631 \u0648\u0627\u0644\u0642\u064A\u0648\u062F \u0648\u0627\u0644\u062F\u0641\u0639\u0627\u062A \u0648\u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0627\u0644\u062F\u0627\u0626\u0646\u0629."
    },
    "exclusionSummary": {
      "en": "Draft/cancelled documents, non-receivable accounts, later accounting entries and settlements effective after cutoff.",
      "ar": "\u0627\u0644\u0645\u0633\u0648\u062F\u0627\u062A \u0648\u0627\u0644\u0645\u0633\u062A\u0646\u062F\u0627\u062A \u0627\u0644\u0645\u0644\u063A\u0627\u0629 \u0648\u0627\u0644\u062D\u0633\u0627\u0628\u0627\u062A \u063A\u064A\u0631 \u0627\u0644\u0645\u062F\u064A\u0646\u0629 \u0648\u0627\u0644\u0642\u064A\u0648\u062F \u0648\u0627\u0644\u062A\u0633\u0648\u064A\u0627\u062A \u0627\u0644\u0641\u0639\u0651\u0627\u0644\u0629 \u0628\u0639\u062F \u0627\u0644\u0642\u0637\u0639."
    },
    "dateBasis": {
      "en": "Inclusive accounting cutoff. Age by maturity date, falling back to journal-item accounting date. Due exactly on cutoff belongs to At Date.",
      "ar": "\u0642\u0637\u0639 \u0645\u062D\u0627\u0633\u0628\u064A \u0634\u0627\u0645\u0644. \u0627\u0644\u0639\u0645\u0631 \u062D\u0633\u0628 \u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0627\u0633\u062A\u062D\u0642\u0627\u0642\u060C \u0645\u0639 \u0627\u0644\u0631\u062C\u0648\u0639 \u0625\u0644\u0649 \u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0642\u064A\u062F \u0639\u0646\u062F \u063A\u064A\u0627\u0628\u0647. \u0627\u0644\u0645\u0633\u062A\u062D\u0642 \u0641\u064A \u064A\u0648\u0645 \u0627\u0644\u0642\u0637\u0639 \u064A\u062F\u062E\u0644 \u0641\u064A \u0634\u0631\u064A\u062D\u0629 \u063A\u064A\u0631 \u0627\u0644\u0645\u062A\u0623\u062E\u0631."
    },
    "refundCreditBehavior": {
      "en": "Signed customer credits remain in their own aging buckets; no arbitrary allocation. Gross positive components and credit balances remain distinct.",
      "ar": "\u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u062F\u0627\u0626\u0646\u0629 \u0627\u0644\u0645\u0648\u0642\u0651\u0639\u0629 \u062A\u0628\u0642\u0649 \u0641\u064A \u0634\u0631\u0627\u0626\u062D \u0623\u0639\u0645\u0627\u0631\u0647\u0627 \u062F\u0648\u0646 \u062A\u062E\u0635\u064A\u0635 \u0627\u0639\u062A\u0628\u0627\u0637\u064A. \u0627\u0644\u0645\u0643\u0648\u0646\u0627\u062A \u0627\u0644\u0645\u0648\u062C\u0628\u0629 \u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A\u0629 \u0645\u0633\u062A\u0642\u0644\u0629 \u0639\u0646 \u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u062F\u0627\u0626\u0646\u0629."
    },
    "aggregationBehavior": {
      "en": "One cutoff; never sum balances across dates. Ratios use aggregates, never summed customer percentages.",
      "ar": "\u062A\u0627\u0631\u064A\u062E \u0642\u0637\u0639 \u0648\u0627\u062D\u062F\u061B \u0644\u0627 \u062A\u064F\u062C\u0645\u0639 \u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u0639\u0628\u0631 \u0627\u0644\u062A\u0648\u0627\u0631\u064A\u062E. \u0627\u0644\u0646\u0633\u0628 \u0645\u0646 \u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A\u0627\u062A \u0648\u0644\u064A\u0633\u062A \u0645\u062C\u0645\u0648\u0639 \u0646\u0633\u0628 \u0627\u0644\u0639\u0645\u0644\u0627\u0621."
    },
    "definitionVersion": 1
  },
  "aged_at_date": {
    "shortDefinition": {
      "en": "Signed receivable balances due on or after cutoff, including due today.",
      "ar": "\u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u0630\u0645\u0645 \u0627\u0644\u0645\u0648\u0642\u0651\u0639\u0629 \u0627\u0644\u0645\u0633\u062A\u062D\u0642\u0629 \u0641\u064A \u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0642\u0637\u0639 \u0623\u0648 \u0628\u0639\u062F\u0647\u060C \u0628\u0645\u0627 \u0641\u064A\u0647\u0627 \u0627\u0644\u0645\u0633\u062A\u062D\u0642\u0629 \u0627\u0644\u064A\u0648\u0645."
    },
    "definition": {
      "en": "Signed receivable balances due on or after cutoff, including due today. Historical residual is reconstructed through cutoff; payments after cutoff do not change that historical balance.",
      "ar": "\u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u0630\u0645\u0645 \u0627\u0644\u0645\u0648\u0642\u0651\u0639\u0629 \u0627\u0644\u0645\u0633\u062A\u062D\u0642\u0629 \u0641\u064A \u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0642\u0637\u0639 \u0623\u0648 \u0628\u0639\u062F\u0647\u060C \u0628\u0645\u0627 \u0641\u064A\u0647\u0627 \u0627\u0644\u0645\u0633\u062A\u062D\u0642\u0629 \u0627\u0644\u064A\u0648\u0645. \u064A\u064F\u0639\u0627\u062F \u0628\u0646\u0627\u0621 \u0627\u0644\u0631\u0635\u064A\u062F \u0627\u0644\u0645\u062A\u0628\u0642\u064A \u062D\u062A\u0649 \u0627\u0644\u0642\u0637\u0639\u061B \u0627\u0644\u062F\u0641\u0639\u0627\u062A \u0627\u0644\u0644\u0627\u062D\u0642\u0629 \u0644\u0627 \u062A\u063A\u064A\u0631 \u0630\u0644\u0643 \u0627\u0644\u0631\u0635\u064A\u062F \u0627\u0644\u062A\u0627\u0631\u064A\u062E\u064A."
    },
    "formula": {
      "en": "Signed receivable balances due on or after cutoff, including due today.",
      "ar": "\u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u0630\u0645\u0645 \u0627\u0644\u0645\u0648\u0642\u0651\u0639\u0629 \u0627\u0644\u0645\u0633\u062A\u062D\u0642\u0629 \u0641\u064A \u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0642\u0637\u0639 \u0623\u0648 \u0628\u0639\u062F\u0647\u060C \u0628\u0645\u0627 \u0641\u064A\u0647\u0627 \u0627\u0644\u0645\u0633\u062A\u062D\u0642\u0629 \u0627\u0644\u064A\u0648\u0645."
    },
    "inclusionSummary": {
      "en": "Posted customer receivable journal items, including invoice, journal/payment and credit-note balances.",
      "ar": "\u0628\u0646\u0648\u062F \u0627\u0644\u0630\u0645\u0645 \u0627\u0644\u0645\u062F\u064A\u0646\u0629 \u0627\u0644\u0645\u064F\u0631\u062D\u0651\u0644\u0629 \u0644\u0644\u0639\u0645\u0644\u0627\u0621\u060C \u0628\u0645\u0627 \u0641\u064A\u0647\u0627 \u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u0641\u0648\u0627\u062A\u064A\u0631 \u0648\u0627\u0644\u0642\u064A\u0648\u062F \u0648\u0627\u0644\u062F\u0641\u0639\u0627\u062A \u0648\u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0627\u0644\u062F\u0627\u0626\u0646\u0629."
    },
    "exclusionSummary": {
      "en": "Draft/cancelled documents, non-receivable accounts, later accounting entries and settlements effective after cutoff.",
      "ar": "\u0627\u0644\u0645\u0633\u0648\u062F\u0627\u062A \u0648\u0627\u0644\u0645\u0633\u062A\u0646\u062F\u0627\u062A \u0627\u0644\u0645\u0644\u063A\u0627\u0629 \u0648\u0627\u0644\u062D\u0633\u0627\u0628\u0627\u062A \u063A\u064A\u0631 \u0627\u0644\u0645\u062F\u064A\u0646\u0629 \u0648\u0627\u0644\u0642\u064A\u0648\u062F \u0648\u0627\u0644\u062A\u0633\u0648\u064A\u0627\u062A \u0627\u0644\u0641\u0639\u0651\u0627\u0644\u0629 \u0628\u0639\u062F \u0627\u0644\u0642\u0637\u0639."
    },
    "dateBasis": {
      "en": "Inclusive accounting cutoff. Age by maturity date, falling back to journal-item accounting date. Due exactly on cutoff belongs to At Date.",
      "ar": "\u0642\u0637\u0639 \u0645\u062D\u0627\u0633\u0628\u064A \u0634\u0627\u0645\u0644. \u0627\u0644\u0639\u0645\u0631 \u062D\u0633\u0628 \u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0627\u0633\u062A\u062D\u0642\u0627\u0642\u060C \u0645\u0639 \u0627\u0644\u0631\u062C\u0648\u0639 \u0625\u0644\u0649 \u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0642\u064A\u062F \u0639\u0646\u062F \u063A\u064A\u0627\u0628\u0647. \u0627\u0644\u0645\u0633\u062A\u062D\u0642 \u0641\u064A \u064A\u0648\u0645 \u0627\u0644\u0642\u0637\u0639 \u064A\u062F\u062E\u0644 \u0641\u064A \u0634\u0631\u064A\u062D\u0629 \u063A\u064A\u0631 \u0627\u0644\u0645\u062A\u0623\u062E\u0631."
    },
    "refundCreditBehavior": {
      "en": "Signed customer credits remain in their own aging buckets; no arbitrary allocation. Gross positive components and credit balances remain distinct.",
      "ar": "\u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u062F\u0627\u0626\u0646\u0629 \u0627\u0644\u0645\u0648\u0642\u0651\u0639\u0629 \u062A\u0628\u0642\u0649 \u0641\u064A \u0634\u0631\u0627\u0626\u062D \u0623\u0639\u0645\u0627\u0631\u0647\u0627 \u062F\u0648\u0646 \u062A\u062E\u0635\u064A\u0635 \u0627\u0639\u062A\u0628\u0627\u0637\u064A. \u0627\u0644\u0645\u0643\u0648\u0646\u0627\u062A \u0627\u0644\u0645\u0648\u062C\u0628\u0629 \u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A\u0629 \u0645\u0633\u062A\u0642\u0644\u0629 \u0639\u0646 \u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u062F\u0627\u0626\u0646\u0629."
    },
    "aggregationBehavior": {
      "en": "One cutoff; never sum balances across dates. Ratios use aggregates, never summed customer percentages.",
      "ar": "\u062A\u0627\u0631\u064A\u062E \u0642\u0637\u0639 \u0648\u0627\u062D\u062F\u061B \u0644\u0627 \u062A\u064F\u062C\u0645\u0639 \u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u0639\u0628\u0631 \u0627\u0644\u062A\u0648\u0627\u0631\u064A\u062E. \u0627\u0644\u0646\u0633\u0628 \u0645\u0646 \u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A\u0627\u062A \u0648\u0644\u064A\u0633\u062A \u0645\u062C\u0645\u0648\u0639 \u0646\u0633\u0628 \u0627\u0644\u0639\u0645\u0644\u0627\u0621."
    },
    "definitionVersion": 1
  },
  "aged_1_30": {
    "shortDefinition": {
      "en": "Signed receivable balances overdue by 1\u201330 days at cutoff.",
      "ar": "\u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u0630\u0645\u0645 \u0627\u0644\u0645\u0648\u0642\u0651\u0639\u0629 \u0627\u0644\u0645\u062A\u0623\u062E\u0631\u0629 \u0661\u2013\u0663\u0660 \u064A\u0648\u0645\u0627\u064B \u0639\u0646\u062F \u0627\u0644\u0642\u0637\u0639."
    },
    "definition": {
      "en": "Signed receivable balances overdue by 1\u201330 days at cutoff. Historical residual is reconstructed through cutoff; payments after cutoff do not change that historical balance.",
      "ar": "\u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u0630\u0645\u0645 \u0627\u0644\u0645\u0648\u0642\u0651\u0639\u0629 \u0627\u0644\u0645\u062A\u0623\u062E\u0631\u0629 \u0661\u2013\u0663\u0660 \u064A\u0648\u0645\u0627\u064B \u0639\u0646\u062F \u0627\u0644\u0642\u0637\u0639. \u064A\u064F\u0639\u0627\u062F \u0628\u0646\u0627\u0621 \u0627\u0644\u0631\u0635\u064A\u062F \u0627\u0644\u0645\u062A\u0628\u0642\u064A \u062D\u062A\u0649 \u0627\u0644\u0642\u0637\u0639\u061B \u0627\u0644\u062F\u0641\u0639\u0627\u062A \u0627\u0644\u0644\u0627\u062D\u0642\u0629 \u0644\u0627 \u062A\u063A\u064A\u0631 \u0630\u0644\u0643 \u0627\u0644\u0631\u0635\u064A\u062F \u0627\u0644\u062A\u0627\u0631\u064A\u062E\u064A."
    },
    "formula": {
      "en": "Signed receivable balances overdue by 1\u201330 days at cutoff.",
      "ar": "\u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u0630\u0645\u0645 \u0627\u0644\u0645\u0648\u0642\u0651\u0639\u0629 \u0627\u0644\u0645\u062A\u0623\u062E\u0631\u0629 \u0661\u2013\u0663\u0660 \u064A\u0648\u0645\u0627\u064B \u0639\u0646\u062F \u0627\u0644\u0642\u0637\u0639."
    },
    "inclusionSummary": {
      "en": "Posted customer receivable journal items, including invoice, journal/payment and credit-note balances.",
      "ar": "\u0628\u0646\u0648\u062F \u0627\u0644\u0630\u0645\u0645 \u0627\u0644\u0645\u062F\u064A\u0646\u0629 \u0627\u0644\u0645\u064F\u0631\u062D\u0651\u0644\u0629 \u0644\u0644\u0639\u0645\u0644\u0627\u0621\u060C \u0628\u0645\u0627 \u0641\u064A\u0647\u0627 \u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u0641\u0648\u0627\u062A\u064A\u0631 \u0648\u0627\u0644\u0642\u064A\u0648\u062F \u0648\u0627\u0644\u062F\u0641\u0639\u0627\u062A \u0648\u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0627\u0644\u062F\u0627\u0626\u0646\u0629."
    },
    "exclusionSummary": {
      "en": "Draft/cancelled documents, non-receivable accounts, later accounting entries and settlements effective after cutoff.",
      "ar": "\u0627\u0644\u0645\u0633\u0648\u062F\u0627\u062A \u0648\u0627\u0644\u0645\u0633\u062A\u0646\u062F\u0627\u062A \u0627\u0644\u0645\u0644\u063A\u0627\u0629 \u0648\u0627\u0644\u062D\u0633\u0627\u0628\u0627\u062A \u063A\u064A\u0631 \u0627\u0644\u0645\u062F\u064A\u0646\u0629 \u0648\u0627\u0644\u0642\u064A\u0648\u062F \u0648\u0627\u0644\u062A\u0633\u0648\u064A\u0627\u062A \u0627\u0644\u0641\u0639\u0651\u0627\u0644\u0629 \u0628\u0639\u062F \u0627\u0644\u0642\u0637\u0639."
    },
    "dateBasis": {
      "en": "Inclusive accounting cutoff. Age by maturity date, falling back to journal-item accounting date. Due exactly on cutoff belongs to At Date.",
      "ar": "\u0642\u0637\u0639 \u0645\u062D\u0627\u0633\u0628\u064A \u0634\u0627\u0645\u0644. \u0627\u0644\u0639\u0645\u0631 \u062D\u0633\u0628 \u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0627\u0633\u062A\u062D\u0642\u0627\u0642\u060C \u0645\u0639 \u0627\u0644\u0631\u062C\u0648\u0639 \u0625\u0644\u0649 \u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0642\u064A\u062F \u0639\u0646\u062F \u063A\u064A\u0627\u0628\u0647. \u0627\u0644\u0645\u0633\u062A\u062D\u0642 \u0641\u064A \u064A\u0648\u0645 \u0627\u0644\u0642\u0637\u0639 \u064A\u062F\u062E\u0644 \u0641\u064A \u0634\u0631\u064A\u062D\u0629 \u063A\u064A\u0631 \u0627\u0644\u0645\u062A\u0623\u062E\u0631."
    },
    "refundCreditBehavior": {
      "en": "Signed customer credits remain in their own aging buckets; no arbitrary allocation. Gross positive components and credit balances remain distinct.",
      "ar": "\u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u062F\u0627\u0626\u0646\u0629 \u0627\u0644\u0645\u0648\u0642\u0651\u0639\u0629 \u062A\u0628\u0642\u0649 \u0641\u064A \u0634\u0631\u0627\u0626\u062D \u0623\u0639\u0645\u0627\u0631\u0647\u0627 \u062F\u0648\u0646 \u062A\u062E\u0635\u064A\u0635 \u0627\u0639\u062A\u0628\u0627\u0637\u064A. \u0627\u0644\u0645\u0643\u0648\u0646\u0627\u062A \u0627\u0644\u0645\u0648\u062C\u0628\u0629 \u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A\u0629 \u0645\u0633\u062A\u0642\u0644\u0629 \u0639\u0646 \u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u062F\u0627\u0626\u0646\u0629."
    },
    "aggregationBehavior": {
      "en": "One cutoff; never sum balances across dates. Ratios use aggregates, never summed customer percentages.",
      "ar": "\u062A\u0627\u0631\u064A\u062E \u0642\u0637\u0639 \u0648\u0627\u062D\u062F\u061B \u0644\u0627 \u062A\u064F\u062C\u0645\u0639 \u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u0639\u0628\u0631 \u0627\u0644\u062A\u0648\u0627\u0631\u064A\u062E. \u0627\u0644\u0646\u0633\u0628 \u0645\u0646 \u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A\u0627\u062A \u0648\u0644\u064A\u0633\u062A \u0645\u062C\u0645\u0648\u0639 \u0646\u0633\u0628 \u0627\u0644\u0639\u0645\u0644\u0627\u0621."
    },
    "definitionVersion": 1
  },
  "aged_31_60": {
    "shortDefinition": {
      "en": "Signed receivable balances overdue by 31\u201360 days at cutoff.",
      "ar": "\u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u0630\u0645\u0645 \u0627\u0644\u0645\u0648\u0642\u0651\u0639\u0629 \u0627\u0644\u0645\u062A\u0623\u062E\u0631\u0629 \u0663\u0661\u2013\u0666\u0660 \u064A\u0648\u0645\u0627\u064B \u0639\u0646\u062F \u0627\u0644\u0642\u0637\u0639."
    },
    "definition": {
      "en": "Signed receivable balances overdue by 31\u201360 days at cutoff. Historical residual is reconstructed through cutoff; payments after cutoff do not change that historical balance.",
      "ar": "\u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u0630\u0645\u0645 \u0627\u0644\u0645\u0648\u0642\u0651\u0639\u0629 \u0627\u0644\u0645\u062A\u0623\u062E\u0631\u0629 \u0663\u0661\u2013\u0666\u0660 \u064A\u0648\u0645\u0627\u064B \u0639\u0646\u062F \u0627\u0644\u0642\u0637\u0639. \u064A\u064F\u0639\u0627\u062F \u0628\u0646\u0627\u0621 \u0627\u0644\u0631\u0635\u064A\u062F \u0627\u0644\u0645\u062A\u0628\u0642\u064A \u062D\u062A\u0649 \u0627\u0644\u0642\u0637\u0639\u061B \u0627\u0644\u062F\u0641\u0639\u0627\u062A \u0627\u0644\u0644\u0627\u062D\u0642\u0629 \u0644\u0627 \u062A\u063A\u064A\u0631 \u0630\u0644\u0643 \u0627\u0644\u0631\u0635\u064A\u062F \u0627\u0644\u062A\u0627\u0631\u064A\u062E\u064A."
    },
    "formula": {
      "en": "Signed receivable balances overdue by 31\u201360 days at cutoff.",
      "ar": "\u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u0630\u0645\u0645 \u0627\u0644\u0645\u0648\u0642\u0651\u0639\u0629 \u0627\u0644\u0645\u062A\u0623\u062E\u0631\u0629 \u0663\u0661\u2013\u0666\u0660 \u064A\u0648\u0645\u0627\u064B \u0639\u0646\u062F \u0627\u0644\u0642\u0637\u0639."
    },
    "inclusionSummary": {
      "en": "Posted customer receivable journal items, including invoice, journal/payment and credit-note balances.",
      "ar": "\u0628\u0646\u0648\u062F \u0627\u0644\u0630\u0645\u0645 \u0627\u0644\u0645\u062F\u064A\u0646\u0629 \u0627\u0644\u0645\u064F\u0631\u062D\u0651\u0644\u0629 \u0644\u0644\u0639\u0645\u0644\u0627\u0621\u060C \u0628\u0645\u0627 \u0641\u064A\u0647\u0627 \u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u0641\u0648\u0627\u062A\u064A\u0631 \u0648\u0627\u0644\u0642\u064A\u0648\u062F \u0648\u0627\u0644\u062F\u0641\u0639\u0627\u062A \u0648\u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0627\u0644\u062F\u0627\u0626\u0646\u0629."
    },
    "exclusionSummary": {
      "en": "Draft/cancelled documents, non-receivable accounts, later accounting entries and settlements effective after cutoff.",
      "ar": "\u0627\u0644\u0645\u0633\u0648\u062F\u0627\u062A \u0648\u0627\u0644\u0645\u0633\u062A\u0646\u062F\u0627\u062A \u0627\u0644\u0645\u0644\u063A\u0627\u0629 \u0648\u0627\u0644\u062D\u0633\u0627\u0628\u0627\u062A \u063A\u064A\u0631 \u0627\u0644\u0645\u062F\u064A\u0646\u0629 \u0648\u0627\u0644\u0642\u064A\u0648\u062F \u0648\u0627\u0644\u062A\u0633\u0648\u064A\u0627\u062A \u0627\u0644\u0641\u0639\u0651\u0627\u0644\u0629 \u0628\u0639\u062F \u0627\u0644\u0642\u0637\u0639."
    },
    "dateBasis": {
      "en": "Inclusive accounting cutoff. Age by maturity date, falling back to journal-item accounting date. Due exactly on cutoff belongs to At Date.",
      "ar": "\u0642\u0637\u0639 \u0645\u062D\u0627\u0633\u0628\u064A \u0634\u0627\u0645\u0644. \u0627\u0644\u0639\u0645\u0631 \u062D\u0633\u0628 \u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0627\u0633\u062A\u062D\u0642\u0627\u0642\u060C \u0645\u0639 \u0627\u0644\u0631\u062C\u0648\u0639 \u0625\u0644\u0649 \u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0642\u064A\u062F \u0639\u0646\u062F \u063A\u064A\u0627\u0628\u0647. \u0627\u0644\u0645\u0633\u062A\u062D\u0642 \u0641\u064A \u064A\u0648\u0645 \u0627\u0644\u0642\u0637\u0639 \u064A\u062F\u062E\u0644 \u0641\u064A \u0634\u0631\u064A\u062D\u0629 \u063A\u064A\u0631 \u0627\u0644\u0645\u062A\u0623\u062E\u0631."
    },
    "refundCreditBehavior": {
      "en": "Signed customer credits remain in their own aging buckets; no arbitrary allocation. Gross positive components and credit balances remain distinct.",
      "ar": "\u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u062F\u0627\u0626\u0646\u0629 \u0627\u0644\u0645\u0648\u0642\u0651\u0639\u0629 \u062A\u0628\u0642\u0649 \u0641\u064A \u0634\u0631\u0627\u0626\u062D \u0623\u0639\u0645\u0627\u0631\u0647\u0627 \u062F\u0648\u0646 \u062A\u062E\u0635\u064A\u0635 \u0627\u0639\u062A\u0628\u0627\u0637\u064A. \u0627\u0644\u0645\u0643\u0648\u0646\u0627\u062A \u0627\u0644\u0645\u0648\u062C\u0628\u0629 \u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A\u0629 \u0645\u0633\u062A\u0642\u0644\u0629 \u0639\u0646 \u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u062F\u0627\u0626\u0646\u0629."
    },
    "aggregationBehavior": {
      "en": "One cutoff; never sum balances across dates. Ratios use aggregates, never summed customer percentages.",
      "ar": "\u062A\u0627\u0631\u064A\u062E \u0642\u0637\u0639 \u0648\u0627\u062D\u062F\u061B \u0644\u0627 \u062A\u064F\u062C\u0645\u0639 \u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u0639\u0628\u0631 \u0627\u0644\u062A\u0648\u0627\u0631\u064A\u062E. \u0627\u0644\u0646\u0633\u0628 \u0645\u0646 \u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A\u0627\u062A \u0648\u0644\u064A\u0633\u062A \u0645\u062C\u0645\u0648\u0639 \u0646\u0633\u0628 \u0627\u0644\u0639\u0645\u0644\u0627\u0621."
    },
    "definitionVersion": 1
  },
  "aged_61_90": {
    "shortDefinition": {
      "en": "Signed receivable balances overdue by 61\u201390 days at cutoff.",
      "ar": "\u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u0630\u0645\u0645 \u0627\u0644\u0645\u0648\u0642\u0651\u0639\u0629 \u0627\u0644\u0645\u062A\u0623\u062E\u0631\u0629 \u0666\u0661\u2013\u0669\u0660 \u064A\u0648\u0645\u0627\u064B \u0639\u0646\u062F \u0627\u0644\u0642\u0637\u0639."
    },
    "definition": {
      "en": "Signed receivable balances overdue by 61\u201390 days at cutoff. Historical residual is reconstructed through cutoff; payments after cutoff do not change that historical balance.",
      "ar": "\u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u0630\u0645\u0645 \u0627\u0644\u0645\u0648\u0642\u0651\u0639\u0629 \u0627\u0644\u0645\u062A\u0623\u062E\u0631\u0629 \u0666\u0661\u2013\u0669\u0660 \u064A\u0648\u0645\u0627\u064B \u0639\u0646\u062F \u0627\u0644\u0642\u0637\u0639. \u064A\u064F\u0639\u0627\u062F \u0628\u0646\u0627\u0621 \u0627\u0644\u0631\u0635\u064A\u062F \u0627\u0644\u0645\u062A\u0628\u0642\u064A \u062D\u062A\u0649 \u0627\u0644\u0642\u0637\u0639\u061B \u0627\u0644\u062F\u0641\u0639\u0627\u062A \u0627\u0644\u0644\u0627\u062D\u0642\u0629 \u0644\u0627 \u062A\u063A\u064A\u0631 \u0630\u0644\u0643 \u0627\u0644\u0631\u0635\u064A\u062F \u0627\u0644\u062A\u0627\u0631\u064A\u062E\u064A."
    },
    "formula": {
      "en": "Signed receivable balances overdue by 61\u201390 days at cutoff.",
      "ar": "\u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u0630\u0645\u0645 \u0627\u0644\u0645\u0648\u0642\u0651\u0639\u0629 \u0627\u0644\u0645\u062A\u0623\u062E\u0631\u0629 \u0666\u0661\u2013\u0669\u0660 \u064A\u0648\u0645\u0627\u064B \u0639\u0646\u062F \u0627\u0644\u0642\u0637\u0639."
    },
    "inclusionSummary": {
      "en": "Posted customer receivable journal items, including invoice, journal/payment and credit-note balances.",
      "ar": "\u0628\u0646\u0648\u062F \u0627\u0644\u0630\u0645\u0645 \u0627\u0644\u0645\u062F\u064A\u0646\u0629 \u0627\u0644\u0645\u064F\u0631\u062D\u0651\u0644\u0629 \u0644\u0644\u0639\u0645\u0644\u0627\u0621\u060C \u0628\u0645\u0627 \u0641\u064A\u0647\u0627 \u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u0641\u0648\u0627\u062A\u064A\u0631 \u0648\u0627\u0644\u0642\u064A\u0648\u062F \u0648\u0627\u0644\u062F\u0641\u0639\u0627\u062A \u0648\u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0627\u0644\u062F\u0627\u0626\u0646\u0629."
    },
    "exclusionSummary": {
      "en": "Draft/cancelled documents, non-receivable accounts, later accounting entries and settlements effective after cutoff.",
      "ar": "\u0627\u0644\u0645\u0633\u0648\u062F\u0627\u062A \u0648\u0627\u0644\u0645\u0633\u062A\u0646\u062F\u0627\u062A \u0627\u0644\u0645\u0644\u063A\u0627\u0629 \u0648\u0627\u0644\u062D\u0633\u0627\u0628\u0627\u062A \u063A\u064A\u0631 \u0627\u0644\u0645\u062F\u064A\u0646\u0629 \u0648\u0627\u0644\u0642\u064A\u0648\u062F \u0648\u0627\u0644\u062A\u0633\u0648\u064A\u0627\u062A \u0627\u0644\u0641\u0639\u0651\u0627\u0644\u0629 \u0628\u0639\u062F \u0627\u0644\u0642\u0637\u0639."
    },
    "dateBasis": {
      "en": "Inclusive accounting cutoff. Age by maturity date, falling back to journal-item accounting date. Due exactly on cutoff belongs to At Date.",
      "ar": "\u0642\u0637\u0639 \u0645\u062D\u0627\u0633\u0628\u064A \u0634\u0627\u0645\u0644. \u0627\u0644\u0639\u0645\u0631 \u062D\u0633\u0628 \u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0627\u0633\u062A\u062D\u0642\u0627\u0642\u060C \u0645\u0639 \u0627\u0644\u0631\u062C\u0648\u0639 \u0625\u0644\u0649 \u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0642\u064A\u062F \u0639\u0646\u062F \u063A\u064A\u0627\u0628\u0647. \u0627\u0644\u0645\u0633\u062A\u062D\u0642 \u0641\u064A \u064A\u0648\u0645 \u0627\u0644\u0642\u0637\u0639 \u064A\u062F\u062E\u0644 \u0641\u064A \u0634\u0631\u064A\u062D\u0629 \u063A\u064A\u0631 \u0627\u0644\u0645\u062A\u0623\u062E\u0631."
    },
    "refundCreditBehavior": {
      "en": "Signed customer credits remain in their own aging buckets; no arbitrary allocation. Gross positive components and credit balances remain distinct.",
      "ar": "\u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u062F\u0627\u0626\u0646\u0629 \u0627\u0644\u0645\u0648\u0642\u0651\u0639\u0629 \u062A\u0628\u0642\u0649 \u0641\u064A \u0634\u0631\u0627\u0626\u062D \u0623\u0639\u0645\u0627\u0631\u0647\u0627 \u062F\u0648\u0646 \u062A\u062E\u0635\u064A\u0635 \u0627\u0639\u062A\u0628\u0627\u0637\u064A. \u0627\u0644\u0645\u0643\u0648\u0646\u0627\u062A \u0627\u0644\u0645\u0648\u062C\u0628\u0629 \u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A\u0629 \u0645\u0633\u062A\u0642\u0644\u0629 \u0639\u0646 \u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u062F\u0627\u0626\u0646\u0629."
    },
    "aggregationBehavior": {
      "en": "One cutoff; never sum balances across dates. Ratios use aggregates, never summed customer percentages.",
      "ar": "\u062A\u0627\u0631\u064A\u062E \u0642\u0637\u0639 \u0648\u0627\u062D\u062F\u061B \u0644\u0627 \u062A\u064F\u062C\u0645\u0639 \u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u0639\u0628\u0631 \u0627\u0644\u062A\u0648\u0627\u0631\u064A\u062E. \u0627\u0644\u0646\u0633\u0628 \u0645\u0646 \u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A\u0627\u062A \u0648\u0644\u064A\u0633\u062A \u0645\u062C\u0645\u0648\u0639 \u0646\u0633\u0628 \u0627\u0644\u0639\u0645\u0644\u0627\u0621."
    },
    "definitionVersion": 1
  },
  "aged_91_120": {
    "shortDefinition": {
      "en": "Signed receivable balances overdue by 91\u2013120 days at cutoff.",
      "ar": "\u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u0630\u0645\u0645 \u0627\u0644\u0645\u0648\u0642\u0651\u0639\u0629 \u0627\u0644\u0645\u062A\u0623\u062E\u0631\u0629 \u0669\u0661\u2013\u0661\u0662\u0660 \u064A\u0648\u0645\u0627\u064B \u0639\u0646\u062F \u0627\u0644\u0642\u0637\u0639."
    },
    "definition": {
      "en": "Signed receivable balances overdue by 91\u2013120 days at cutoff. Historical residual is reconstructed through cutoff; payments after cutoff do not change that historical balance.",
      "ar": "\u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u0630\u0645\u0645 \u0627\u0644\u0645\u0648\u0642\u0651\u0639\u0629 \u0627\u0644\u0645\u062A\u0623\u062E\u0631\u0629 \u0669\u0661\u2013\u0661\u0662\u0660 \u064A\u0648\u0645\u0627\u064B \u0639\u0646\u062F \u0627\u0644\u0642\u0637\u0639. \u064A\u064F\u0639\u0627\u062F \u0628\u0646\u0627\u0621 \u0627\u0644\u0631\u0635\u064A\u062F \u0627\u0644\u0645\u062A\u0628\u0642\u064A \u062D\u062A\u0649 \u0627\u0644\u0642\u0637\u0639\u061B \u0627\u0644\u062F\u0641\u0639\u0627\u062A \u0627\u0644\u0644\u0627\u062D\u0642\u0629 \u0644\u0627 \u062A\u063A\u064A\u0631 \u0630\u0644\u0643 \u0627\u0644\u0631\u0635\u064A\u062F \u0627\u0644\u062A\u0627\u0631\u064A\u062E\u064A."
    },
    "formula": {
      "en": "Signed receivable balances overdue by 91\u2013120 days at cutoff.",
      "ar": "\u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u0630\u0645\u0645 \u0627\u0644\u0645\u0648\u0642\u0651\u0639\u0629 \u0627\u0644\u0645\u062A\u0623\u062E\u0631\u0629 \u0669\u0661\u2013\u0661\u0662\u0660 \u064A\u0648\u0645\u0627\u064B \u0639\u0646\u062F \u0627\u0644\u0642\u0637\u0639."
    },
    "inclusionSummary": {
      "en": "Posted customer receivable journal items, including invoice, journal/payment and credit-note balances.",
      "ar": "\u0628\u0646\u0648\u062F \u0627\u0644\u0630\u0645\u0645 \u0627\u0644\u0645\u062F\u064A\u0646\u0629 \u0627\u0644\u0645\u064F\u0631\u062D\u0651\u0644\u0629 \u0644\u0644\u0639\u0645\u0644\u0627\u0621\u060C \u0628\u0645\u0627 \u0641\u064A\u0647\u0627 \u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u0641\u0648\u0627\u062A\u064A\u0631 \u0648\u0627\u0644\u0642\u064A\u0648\u062F \u0648\u0627\u0644\u062F\u0641\u0639\u0627\u062A \u0648\u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0627\u0644\u062F\u0627\u0626\u0646\u0629."
    },
    "exclusionSummary": {
      "en": "Draft/cancelled documents, non-receivable accounts, later accounting entries and settlements effective after cutoff.",
      "ar": "\u0627\u0644\u0645\u0633\u0648\u062F\u0627\u062A \u0648\u0627\u0644\u0645\u0633\u062A\u0646\u062F\u0627\u062A \u0627\u0644\u0645\u0644\u063A\u0627\u0629 \u0648\u0627\u0644\u062D\u0633\u0627\u0628\u0627\u062A \u063A\u064A\u0631 \u0627\u0644\u0645\u062F\u064A\u0646\u0629 \u0648\u0627\u0644\u0642\u064A\u0648\u062F \u0648\u0627\u0644\u062A\u0633\u0648\u064A\u0627\u062A \u0627\u0644\u0641\u0639\u0651\u0627\u0644\u0629 \u0628\u0639\u062F \u0627\u0644\u0642\u0637\u0639."
    },
    "dateBasis": {
      "en": "Inclusive accounting cutoff. Age by maturity date, falling back to journal-item accounting date. Due exactly on cutoff belongs to At Date.",
      "ar": "\u0642\u0637\u0639 \u0645\u062D\u0627\u0633\u0628\u064A \u0634\u0627\u0645\u0644. \u0627\u0644\u0639\u0645\u0631 \u062D\u0633\u0628 \u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0627\u0633\u062A\u062D\u0642\u0627\u0642\u060C \u0645\u0639 \u0627\u0644\u0631\u062C\u0648\u0639 \u0625\u0644\u0649 \u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0642\u064A\u062F \u0639\u0646\u062F \u063A\u064A\u0627\u0628\u0647. \u0627\u0644\u0645\u0633\u062A\u062D\u0642 \u0641\u064A \u064A\u0648\u0645 \u0627\u0644\u0642\u0637\u0639 \u064A\u062F\u062E\u0644 \u0641\u064A \u0634\u0631\u064A\u062D\u0629 \u063A\u064A\u0631 \u0627\u0644\u0645\u062A\u0623\u062E\u0631."
    },
    "refundCreditBehavior": {
      "en": "Signed customer credits remain in their own aging buckets; no arbitrary allocation. Gross positive components and credit balances remain distinct.",
      "ar": "\u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u062F\u0627\u0626\u0646\u0629 \u0627\u0644\u0645\u0648\u0642\u0651\u0639\u0629 \u062A\u0628\u0642\u0649 \u0641\u064A \u0634\u0631\u0627\u0626\u062D \u0623\u0639\u0645\u0627\u0631\u0647\u0627 \u062F\u0648\u0646 \u062A\u062E\u0635\u064A\u0635 \u0627\u0639\u062A\u0628\u0627\u0637\u064A. \u0627\u0644\u0645\u0643\u0648\u0646\u0627\u062A \u0627\u0644\u0645\u0648\u062C\u0628\u0629 \u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A\u0629 \u0645\u0633\u062A\u0642\u0644\u0629 \u0639\u0646 \u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u062F\u0627\u0626\u0646\u0629."
    },
    "aggregationBehavior": {
      "en": "One cutoff; never sum balances across dates. Ratios use aggregates, never summed customer percentages.",
      "ar": "\u062A\u0627\u0631\u064A\u062E \u0642\u0637\u0639 \u0648\u0627\u062D\u062F\u061B \u0644\u0627 \u062A\u064F\u062C\u0645\u0639 \u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u0639\u0628\u0631 \u0627\u0644\u062A\u0648\u0627\u0631\u064A\u062E. \u0627\u0644\u0646\u0633\u0628 \u0645\u0646 \u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A\u0627\u062A \u0648\u0644\u064A\u0633\u062A \u0645\u062C\u0645\u0648\u0639 \u0646\u0633\u0628 \u0627\u0644\u0639\u0645\u0644\u0627\u0621."
    },
    "definitionVersion": 1
  },
  "aged_over_120": {
    "shortDefinition": {
      "en": "Signed receivable balances overdue by more than 120 days at cutoff.",
      "ar": "\u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u0630\u0645\u0645 \u0627\u0644\u0645\u0648\u0642\u0651\u0639\u0629 \u0627\u0644\u0645\u062A\u0623\u062E\u0631\u0629 \u0623\u0643\u062B\u0631 \u0645\u0646 \u0661\u0662\u0660 \u064A\u0648\u0645\u0627\u064B \u0639\u0646\u062F \u0627\u0644\u0642\u0637\u0639."
    },
    "definition": {
      "en": "Signed receivable balances overdue by more than 120 days at cutoff. Historical residual is reconstructed through cutoff; payments after cutoff do not change that historical balance.",
      "ar": "\u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u0630\u0645\u0645 \u0627\u0644\u0645\u0648\u0642\u0651\u0639\u0629 \u0627\u0644\u0645\u062A\u0623\u062E\u0631\u0629 \u0623\u0643\u062B\u0631 \u0645\u0646 \u0661\u0662\u0660 \u064A\u0648\u0645\u0627\u064B \u0639\u0646\u062F \u0627\u0644\u0642\u0637\u0639. \u064A\u064F\u0639\u0627\u062F \u0628\u0646\u0627\u0621 \u0627\u0644\u0631\u0635\u064A\u062F \u0627\u0644\u0645\u062A\u0628\u0642\u064A \u062D\u062A\u0649 \u0627\u0644\u0642\u0637\u0639\u061B \u0627\u0644\u062F\u0641\u0639\u0627\u062A \u0627\u0644\u0644\u0627\u062D\u0642\u0629 \u0644\u0627 \u062A\u063A\u064A\u0631 \u0630\u0644\u0643 \u0627\u0644\u0631\u0635\u064A\u062F \u0627\u0644\u062A\u0627\u0631\u064A\u062E\u064A."
    },
    "formula": {
      "en": "Signed receivable balances overdue by more than 120 days at cutoff.",
      "ar": "\u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u0630\u0645\u0645 \u0627\u0644\u0645\u0648\u0642\u0651\u0639\u0629 \u0627\u0644\u0645\u062A\u0623\u062E\u0631\u0629 \u0623\u0643\u062B\u0631 \u0645\u0646 \u0661\u0662\u0660 \u064A\u0648\u0645\u0627\u064B \u0639\u0646\u062F \u0627\u0644\u0642\u0637\u0639."
    },
    "inclusionSummary": {
      "en": "Posted customer receivable journal items, including invoice, journal/payment and credit-note balances.",
      "ar": "\u0628\u0646\u0648\u062F \u0627\u0644\u0630\u0645\u0645 \u0627\u0644\u0645\u062F\u064A\u0646\u0629 \u0627\u0644\u0645\u064F\u0631\u062D\u0651\u0644\u0629 \u0644\u0644\u0639\u0645\u0644\u0627\u0621\u060C \u0628\u0645\u0627 \u0641\u064A\u0647\u0627 \u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u0641\u0648\u0627\u062A\u064A\u0631 \u0648\u0627\u0644\u0642\u064A\u0648\u062F \u0648\u0627\u0644\u062F\u0641\u0639\u0627\u062A \u0648\u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0627\u0644\u062F\u0627\u0626\u0646\u0629."
    },
    "exclusionSummary": {
      "en": "Draft/cancelled documents, non-receivable accounts, later accounting entries and settlements effective after cutoff.",
      "ar": "\u0627\u0644\u0645\u0633\u0648\u062F\u0627\u062A \u0648\u0627\u0644\u0645\u0633\u062A\u0646\u062F\u0627\u062A \u0627\u0644\u0645\u0644\u063A\u0627\u0629 \u0648\u0627\u0644\u062D\u0633\u0627\u0628\u0627\u062A \u063A\u064A\u0631 \u0627\u0644\u0645\u062F\u064A\u0646\u0629 \u0648\u0627\u0644\u0642\u064A\u0648\u062F \u0648\u0627\u0644\u062A\u0633\u0648\u064A\u0627\u062A \u0627\u0644\u0641\u0639\u0651\u0627\u0644\u0629 \u0628\u0639\u062F \u0627\u0644\u0642\u0637\u0639."
    },
    "dateBasis": {
      "en": "Inclusive accounting cutoff. Age by maturity date, falling back to journal-item accounting date. Due exactly on cutoff belongs to At Date.",
      "ar": "\u0642\u0637\u0639 \u0645\u062D\u0627\u0633\u0628\u064A \u0634\u0627\u0645\u0644. \u0627\u0644\u0639\u0645\u0631 \u062D\u0633\u0628 \u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0627\u0633\u062A\u062D\u0642\u0627\u0642\u060C \u0645\u0639 \u0627\u0644\u0631\u062C\u0648\u0639 \u0625\u0644\u0649 \u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0642\u064A\u062F \u0639\u0646\u062F \u063A\u064A\u0627\u0628\u0647. \u0627\u0644\u0645\u0633\u062A\u062D\u0642 \u0641\u064A \u064A\u0648\u0645 \u0627\u0644\u0642\u0637\u0639 \u064A\u062F\u062E\u0644 \u0641\u064A \u0634\u0631\u064A\u062D\u0629 \u063A\u064A\u0631 \u0627\u0644\u0645\u062A\u0623\u062E\u0631."
    },
    "refundCreditBehavior": {
      "en": "Signed customer credits remain in their own aging buckets; no arbitrary allocation. Gross positive components and credit balances remain distinct.",
      "ar": "\u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u062F\u0627\u0626\u0646\u0629 \u0627\u0644\u0645\u0648\u0642\u0651\u0639\u0629 \u062A\u0628\u0642\u0649 \u0641\u064A \u0634\u0631\u0627\u0626\u062D \u0623\u0639\u0645\u0627\u0631\u0647\u0627 \u062F\u0648\u0646 \u062A\u062E\u0635\u064A\u0635 \u0627\u0639\u062A\u0628\u0627\u0637\u064A. \u0627\u0644\u0645\u0643\u0648\u0646\u0627\u062A \u0627\u0644\u0645\u0648\u062C\u0628\u0629 \u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A\u0629 \u0645\u0633\u062A\u0642\u0644\u0629 \u0639\u0646 \u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u062F\u0627\u0626\u0646\u0629."
    },
    "aggregationBehavior": {
      "en": "One cutoff; never sum balances across dates. Ratios use aggregates, never summed customer percentages.",
      "ar": "\u062A\u0627\u0631\u064A\u062E \u0642\u0637\u0639 \u0648\u0627\u062D\u062F\u061B \u0644\u0627 \u062A\u064F\u062C\u0645\u0639 \u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u0639\u0628\u0631 \u0627\u0644\u062A\u0648\u0627\u0631\u064A\u062E. \u0627\u0644\u0646\u0633\u0628 \u0645\u0646 \u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A\u0627\u062A \u0648\u0644\u064A\u0633\u062A \u0645\u062C\u0645\u0648\u0639 \u0646\u0633\u0628 \u0627\u0644\u0639\u0645\u0644\u0627\u0621."
    },
    "definitionVersion": 1
  },
  "total_overdue_receivable": {
    "shortDefinition": {
      "en": "Sum of the five signed overdue buckets at the same cutoff.",
      "ar": "\u0645\u062C\u0645\u0648\u0639 \u0634\u0631\u0627\u0626\u062D \u0627\u0644\u062A\u0623\u062E\u0631 \u0627\u0644\u062E\u0645\u0633 \u0627\u0644\u0645\u0648\u0642\u0651\u0639\u0629 \u0639\u0646\u062F \u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0642\u0637\u0639 \u0646\u0641\u0633\u0647."
    },
    "definition": {
      "en": "Sum of the five signed overdue buckets at the same cutoff. Historical residual is reconstructed through cutoff; payments after cutoff do not change that historical balance.",
      "ar": "\u0645\u062C\u0645\u0648\u0639 \u0634\u0631\u0627\u0626\u062D \u0627\u0644\u062A\u0623\u062E\u0631 \u0627\u0644\u062E\u0645\u0633 \u0627\u0644\u0645\u0648\u0642\u0651\u0639\u0629 \u0639\u0646\u062F \u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0642\u0637\u0639 \u0646\u0641\u0633\u0647. \u064A\u064F\u0639\u0627\u062F \u0628\u0646\u0627\u0621 \u0627\u0644\u0631\u0635\u064A\u062F \u0627\u0644\u0645\u062A\u0628\u0642\u064A \u062D\u062A\u0649 \u0627\u0644\u0642\u0637\u0639\u061B \u0627\u0644\u062F\u0641\u0639\u0627\u062A \u0627\u0644\u0644\u0627\u062D\u0642\u0629 \u0644\u0627 \u062A\u063A\u064A\u0631 \u0630\u0644\u0643 \u0627\u0644\u0631\u0635\u064A\u062F \u0627\u0644\u062A\u0627\u0631\u064A\u062E\u064A."
    },
    "formula": {
      "en": "1\u201330 + 31\u201360 + 61\u201390 + 91\u2013120 + >120",
      "ar": "\u0661\u2013\u0663\u0660 + \u0663\u0661\u2013\u0666\u0660 + \u0666\u0661\u2013\u0669\u0660 + \u0669\u0661\u2013\u0661\u0662\u0660 + \u0623\u0643\u062B\u0631 \u0645\u0646 \u0661\u0662\u0660"
    },
    "inclusionSummary": {
      "en": "Posted customer receivable journal items, including invoice, journal/payment and credit-note balances.",
      "ar": "\u0628\u0646\u0648\u062F \u0627\u0644\u0630\u0645\u0645 \u0627\u0644\u0645\u062F\u064A\u0646\u0629 \u0627\u0644\u0645\u064F\u0631\u062D\u0651\u0644\u0629 \u0644\u0644\u0639\u0645\u0644\u0627\u0621\u060C \u0628\u0645\u0627 \u0641\u064A\u0647\u0627 \u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u0641\u0648\u0627\u062A\u064A\u0631 \u0648\u0627\u0644\u0642\u064A\u0648\u062F \u0648\u0627\u0644\u062F\u0641\u0639\u0627\u062A \u0648\u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0627\u0644\u062F\u0627\u0626\u0646\u0629."
    },
    "exclusionSummary": {
      "en": "Draft/cancelled documents, non-receivable accounts, later accounting entries and settlements effective after cutoff.",
      "ar": "\u0627\u0644\u0645\u0633\u0648\u062F\u0627\u062A \u0648\u0627\u0644\u0645\u0633\u062A\u0646\u062F\u0627\u062A \u0627\u0644\u0645\u0644\u063A\u0627\u0629 \u0648\u0627\u0644\u062D\u0633\u0627\u0628\u0627\u062A \u063A\u064A\u0631 \u0627\u0644\u0645\u062F\u064A\u0646\u0629 \u0648\u0627\u0644\u0642\u064A\u0648\u062F \u0648\u0627\u0644\u062A\u0633\u0648\u064A\u0627\u062A \u0627\u0644\u0641\u0639\u0651\u0627\u0644\u0629 \u0628\u0639\u062F \u0627\u0644\u0642\u0637\u0639."
    },
    "dateBasis": {
      "en": "Inclusive accounting cutoff. Age by maturity date, falling back to journal-item accounting date. Due exactly on cutoff belongs to At Date.",
      "ar": "\u0642\u0637\u0639 \u0645\u062D\u0627\u0633\u0628\u064A \u0634\u0627\u0645\u0644. \u0627\u0644\u0639\u0645\u0631 \u062D\u0633\u0628 \u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0627\u0633\u062A\u062D\u0642\u0627\u0642\u060C \u0645\u0639 \u0627\u0644\u0631\u062C\u0648\u0639 \u0625\u0644\u0649 \u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0642\u064A\u062F \u0639\u0646\u062F \u063A\u064A\u0627\u0628\u0647. \u0627\u0644\u0645\u0633\u062A\u062D\u0642 \u0641\u064A \u064A\u0648\u0645 \u0627\u0644\u0642\u0637\u0639 \u064A\u062F\u062E\u0644 \u0641\u064A \u0634\u0631\u064A\u062D\u0629 \u063A\u064A\u0631 \u0627\u0644\u0645\u062A\u0623\u062E\u0631."
    },
    "refundCreditBehavior": {
      "en": "Signed customer credits remain in their own aging buckets; no arbitrary allocation. Gross positive components and credit balances remain distinct.",
      "ar": "\u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u062F\u0627\u0626\u0646\u0629 \u0627\u0644\u0645\u0648\u0642\u0651\u0639\u0629 \u062A\u0628\u0642\u0649 \u0641\u064A \u0634\u0631\u0627\u0626\u062D \u0623\u0639\u0645\u0627\u0631\u0647\u0627 \u062F\u0648\u0646 \u062A\u062E\u0635\u064A\u0635 \u0627\u0639\u062A\u0628\u0627\u0637\u064A. \u0627\u0644\u0645\u0643\u0648\u0646\u0627\u062A \u0627\u0644\u0645\u0648\u062C\u0628\u0629 \u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A\u0629 \u0645\u0633\u062A\u0642\u0644\u0629 \u0639\u0646 \u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u062F\u0627\u0626\u0646\u0629."
    },
    "aggregationBehavior": {
      "en": "One cutoff; never sum balances across dates. Ratios use aggregates, never summed customer percentages.",
      "ar": "\u062A\u0627\u0631\u064A\u062E \u0642\u0637\u0639 \u0648\u0627\u062D\u062F\u061B \u0644\u0627 \u062A\u064F\u062C\u0645\u0639 \u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u0639\u0628\u0631 \u0627\u0644\u062A\u0648\u0627\u0631\u064A\u062E. \u0627\u0644\u0646\u0633\u0628 \u0645\u0646 \u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A\u0627\u062A \u0648\u0644\u064A\u0633\u062A \u0645\u062C\u0645\u0648\u0639 \u0646\u0633\u0628 \u0627\u0644\u0639\u0645\u0644\u0627\u0621."
    },
    "definitionVersion": 1
  },
  "gross_open_receivable_components": {
    "shortDefinition": {
      "en": "Positive open receivable components before remaining credit balances are netted.",
      "ar": "\u0645\u0643\u0648\u0646\u0627\u062A \u0627\u0644\u0630\u0645\u0645 \u0627\u0644\u0645\u0641\u062A\u0648\u062D\u0629 \u0627\u0644\u0645\u0648\u062C\u0628\u0629 \u0642\u0628\u0644 \u0627\u062D\u062A\u0633\u0627\u0628 \u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u062F\u0627\u0626\u0646\u0629 \u0627\u0644\u0645\u062A\u0628\u0642\u064A\u0629."
    },
    "definition": {
      "en": "Positive open receivable components before remaining credit balances are netted. Historical residual is reconstructed through cutoff; payments after cutoff do not change that historical balance.",
      "ar": "\u0645\u0643\u0648\u0646\u0627\u062A \u0627\u0644\u0630\u0645\u0645 \u0627\u0644\u0645\u0641\u062A\u0648\u062D\u0629 \u0627\u0644\u0645\u0648\u062C\u0628\u0629 \u0642\u0628\u0644 \u0627\u062D\u062A\u0633\u0627\u0628 \u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u062F\u0627\u0626\u0646\u0629 \u0627\u0644\u0645\u062A\u0628\u0642\u064A\u0629. \u064A\u064F\u0639\u0627\u062F \u0628\u0646\u0627\u0621 \u0627\u0644\u0631\u0635\u064A\u062F \u0627\u0644\u0645\u062A\u0628\u0642\u064A \u062D\u062A\u0649 \u0627\u0644\u0642\u0637\u0639\u061B \u0627\u0644\u062F\u0641\u0639\u0627\u062A \u0627\u0644\u0644\u0627\u062D\u0642\u0629 \u0644\u0627 \u062A\u063A\u064A\u0631 \u0630\u0644\u0643 \u0627\u0644\u0631\u0635\u064A\u062F \u0627\u0644\u062A\u0627\u0631\u064A\u062E\u064A."
    },
    "formula": {
      "en": "Positive open receivable components before remaining credit balances are netted.",
      "ar": "\u0645\u0643\u0648\u0646\u0627\u062A \u0627\u0644\u0630\u0645\u0645 \u0627\u0644\u0645\u0641\u062A\u0648\u062D\u0629 \u0627\u0644\u0645\u0648\u062C\u0628\u0629 \u0642\u0628\u0644 \u0627\u062D\u062A\u0633\u0627\u0628 \u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u062F\u0627\u0626\u0646\u0629 \u0627\u0644\u0645\u062A\u0628\u0642\u064A\u0629."
    },
    "inclusionSummary": {
      "en": "Posted customer receivable journal items, including invoice, journal/payment and credit-note balances.",
      "ar": "\u0628\u0646\u0648\u062F \u0627\u0644\u0630\u0645\u0645 \u0627\u0644\u0645\u062F\u064A\u0646\u0629 \u0627\u0644\u0645\u064F\u0631\u062D\u0651\u0644\u0629 \u0644\u0644\u0639\u0645\u0644\u0627\u0621\u060C \u0628\u0645\u0627 \u0641\u064A\u0647\u0627 \u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u0641\u0648\u0627\u062A\u064A\u0631 \u0648\u0627\u0644\u0642\u064A\u0648\u062F \u0648\u0627\u0644\u062F\u0641\u0639\u0627\u062A \u0648\u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0627\u0644\u062F\u0627\u0626\u0646\u0629."
    },
    "exclusionSummary": {
      "en": "Draft/cancelled documents, non-receivable accounts, later accounting entries and settlements effective after cutoff.",
      "ar": "\u0627\u0644\u0645\u0633\u0648\u062F\u0627\u062A \u0648\u0627\u0644\u0645\u0633\u062A\u0646\u062F\u0627\u062A \u0627\u0644\u0645\u0644\u063A\u0627\u0629 \u0648\u0627\u0644\u062D\u0633\u0627\u0628\u0627\u062A \u063A\u064A\u0631 \u0627\u0644\u0645\u062F\u064A\u0646\u0629 \u0648\u0627\u0644\u0642\u064A\u0648\u062F \u0648\u0627\u0644\u062A\u0633\u0648\u064A\u0627\u062A \u0627\u0644\u0641\u0639\u0651\u0627\u0644\u0629 \u0628\u0639\u062F \u0627\u0644\u0642\u0637\u0639."
    },
    "dateBasis": {
      "en": "Inclusive accounting cutoff. Age by maturity date, falling back to journal-item accounting date. Due exactly on cutoff belongs to At Date.",
      "ar": "\u0642\u0637\u0639 \u0645\u062D\u0627\u0633\u0628\u064A \u0634\u0627\u0645\u0644. \u0627\u0644\u0639\u0645\u0631 \u062D\u0633\u0628 \u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0627\u0633\u062A\u062D\u0642\u0627\u0642\u060C \u0645\u0639 \u0627\u0644\u0631\u062C\u0648\u0639 \u0625\u0644\u0649 \u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0642\u064A\u062F \u0639\u0646\u062F \u063A\u064A\u0627\u0628\u0647. \u0627\u0644\u0645\u0633\u062A\u062D\u0642 \u0641\u064A \u064A\u0648\u0645 \u0627\u0644\u0642\u0637\u0639 \u064A\u062F\u062E\u0644 \u0641\u064A \u0634\u0631\u064A\u062D\u0629 \u063A\u064A\u0631 \u0627\u0644\u0645\u062A\u0623\u062E\u0631."
    },
    "refundCreditBehavior": {
      "en": "Signed customer credits remain in their own aging buckets; no arbitrary allocation. Gross positive components and credit balances remain distinct.",
      "ar": "\u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u062F\u0627\u0626\u0646\u0629 \u0627\u0644\u0645\u0648\u0642\u0651\u0639\u0629 \u062A\u0628\u0642\u0649 \u0641\u064A \u0634\u0631\u0627\u0626\u062D \u0623\u0639\u0645\u0627\u0631\u0647\u0627 \u062F\u0648\u0646 \u062A\u062E\u0635\u064A\u0635 \u0627\u0639\u062A\u0628\u0627\u0637\u064A. \u0627\u0644\u0645\u0643\u0648\u0646\u0627\u062A \u0627\u0644\u0645\u0648\u062C\u0628\u0629 \u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A\u0629 \u0645\u0633\u062A\u0642\u0644\u0629 \u0639\u0646 \u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u062F\u0627\u0626\u0646\u0629."
    },
    "aggregationBehavior": {
      "en": "One cutoff; never sum balances across dates. Ratios use aggregates, never summed customer percentages.",
      "ar": "\u062A\u0627\u0631\u064A\u062E \u0642\u0637\u0639 \u0648\u0627\u062D\u062F\u061B \u0644\u0627 \u062A\u064F\u062C\u0645\u0639 \u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u0639\u0628\u0631 \u0627\u0644\u062A\u0648\u0627\u0631\u064A\u062E. \u0627\u0644\u0646\u0633\u0628 \u0645\u0646 \u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A\u0627\u062A \u0648\u0644\u064A\u0633\u062A \u0645\u062C\u0645\u0648\u0639 \u0646\u0633\u0628 \u0627\u0644\u0639\u0645\u0644\u0627\u0621."
    },
    "definitionVersion": 1
  },
  "credit_balances": {
    "shortDefinition": {
      "en": "Remaining negative open receivable components, shown with their negative sign.",
      "ar": "\u0645\u0643\u0648\u0646\u0627\u062A \u0627\u0644\u0630\u0645\u0645 \u0627\u0644\u0645\u0641\u062A\u0648\u062D\u0629 \u0627\u0644\u0633\u0627\u0644\u0628\u0629 \u0627\u0644\u0645\u062A\u0628\u0642\u064A\u0629\u060C \u0645\u0639\u0631\u0648\u0636\u0629 \u0628\u0625\u0634\u0627\u0631\u062A\u0647\u0627 \u0627\u0644\u0633\u0627\u0644\u0628\u0629."
    },
    "definition": {
      "en": "Remaining negative open receivable components, shown with their negative sign. Historical residual is reconstructed through cutoff; payments after cutoff do not change that historical balance.",
      "ar": "\u0645\u0643\u0648\u0646\u0627\u062A \u0627\u0644\u0630\u0645\u0645 \u0627\u0644\u0645\u0641\u062A\u0648\u062D\u0629 \u0627\u0644\u0633\u0627\u0644\u0628\u0629 \u0627\u0644\u0645\u062A\u0628\u0642\u064A\u0629\u060C \u0645\u0639\u0631\u0648\u0636\u0629 \u0628\u0625\u0634\u0627\u0631\u062A\u0647\u0627 \u0627\u0644\u0633\u0627\u0644\u0628\u0629. \u064A\u064F\u0639\u0627\u062F \u0628\u0646\u0627\u0621 \u0627\u0644\u0631\u0635\u064A\u062F \u0627\u0644\u0645\u062A\u0628\u0642\u064A \u062D\u062A\u0649 \u0627\u0644\u0642\u0637\u0639\u061B \u0627\u0644\u062F\u0641\u0639\u0627\u062A \u0627\u0644\u0644\u0627\u062D\u0642\u0629 \u0644\u0627 \u062A\u063A\u064A\u0631 \u0630\u0644\u0643 \u0627\u0644\u0631\u0635\u064A\u062F \u0627\u0644\u062A\u0627\u0631\u064A\u062E\u064A."
    },
    "formula": {
      "en": "Remaining negative open receivable components, shown with their negative sign.",
      "ar": "\u0645\u0643\u0648\u0646\u0627\u062A \u0627\u0644\u0630\u0645\u0645 \u0627\u0644\u0645\u0641\u062A\u0648\u062D\u0629 \u0627\u0644\u0633\u0627\u0644\u0628\u0629 \u0627\u0644\u0645\u062A\u0628\u0642\u064A\u0629\u060C \u0645\u0639\u0631\u0648\u0636\u0629 \u0628\u0625\u0634\u0627\u0631\u062A\u0647\u0627 \u0627\u0644\u0633\u0627\u0644\u0628\u0629."
    },
    "inclusionSummary": {
      "en": "Posted customer receivable journal items, including invoice, journal/payment and credit-note balances.",
      "ar": "\u0628\u0646\u0648\u062F \u0627\u0644\u0630\u0645\u0645 \u0627\u0644\u0645\u062F\u064A\u0646\u0629 \u0627\u0644\u0645\u064F\u0631\u062D\u0651\u0644\u0629 \u0644\u0644\u0639\u0645\u0644\u0627\u0621\u060C \u0628\u0645\u0627 \u0641\u064A\u0647\u0627 \u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u0641\u0648\u0627\u062A\u064A\u0631 \u0648\u0627\u0644\u0642\u064A\u0648\u062F \u0648\u0627\u0644\u062F\u0641\u0639\u0627\u062A \u0648\u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0627\u0644\u062F\u0627\u0626\u0646\u0629."
    },
    "exclusionSummary": {
      "en": "Draft/cancelled documents, non-receivable accounts, later accounting entries and settlements effective after cutoff.",
      "ar": "\u0627\u0644\u0645\u0633\u0648\u062F\u0627\u062A \u0648\u0627\u0644\u0645\u0633\u062A\u0646\u062F\u0627\u062A \u0627\u0644\u0645\u0644\u063A\u0627\u0629 \u0648\u0627\u0644\u062D\u0633\u0627\u0628\u0627\u062A \u063A\u064A\u0631 \u0627\u0644\u0645\u062F\u064A\u0646\u0629 \u0648\u0627\u0644\u0642\u064A\u0648\u062F \u0648\u0627\u0644\u062A\u0633\u0648\u064A\u0627\u062A \u0627\u0644\u0641\u0639\u0651\u0627\u0644\u0629 \u0628\u0639\u062F \u0627\u0644\u0642\u0637\u0639."
    },
    "dateBasis": {
      "en": "Inclusive accounting cutoff. Age by maturity date, falling back to journal-item accounting date. Due exactly on cutoff belongs to At Date.",
      "ar": "\u0642\u0637\u0639 \u0645\u062D\u0627\u0633\u0628\u064A \u0634\u0627\u0645\u0644. \u0627\u0644\u0639\u0645\u0631 \u062D\u0633\u0628 \u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0627\u0633\u062A\u062D\u0642\u0627\u0642\u060C \u0645\u0639 \u0627\u0644\u0631\u062C\u0648\u0639 \u0625\u0644\u0649 \u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0642\u064A\u062F \u0639\u0646\u062F \u063A\u064A\u0627\u0628\u0647. \u0627\u0644\u0645\u0633\u062A\u062D\u0642 \u0641\u064A \u064A\u0648\u0645 \u0627\u0644\u0642\u0637\u0639 \u064A\u062F\u062E\u0644 \u0641\u064A \u0634\u0631\u064A\u062D\u0629 \u063A\u064A\u0631 \u0627\u0644\u0645\u062A\u0623\u062E\u0631."
    },
    "refundCreditBehavior": {
      "en": "Signed customer credits remain in their own aging buckets; no arbitrary allocation. Gross positive components and credit balances remain distinct.",
      "ar": "\u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u062F\u0627\u0626\u0646\u0629 \u0627\u0644\u0645\u0648\u0642\u0651\u0639\u0629 \u062A\u0628\u0642\u0649 \u0641\u064A \u0634\u0631\u0627\u0626\u062D \u0623\u0639\u0645\u0627\u0631\u0647\u0627 \u062F\u0648\u0646 \u062A\u062E\u0635\u064A\u0635 \u0627\u0639\u062A\u0628\u0627\u0637\u064A. \u0627\u0644\u0645\u0643\u0648\u0646\u0627\u062A \u0627\u0644\u0645\u0648\u062C\u0628\u0629 \u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A\u0629 \u0645\u0633\u062A\u0642\u0644\u0629 \u0639\u0646 \u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u062F\u0627\u0626\u0646\u0629."
    },
    "aggregationBehavior": {
      "en": "One cutoff; never sum balances across dates. Ratios use aggregates, never summed customer percentages.",
      "ar": "\u062A\u0627\u0631\u064A\u062E \u0642\u0637\u0639 \u0648\u0627\u062D\u062F\u061B \u0644\u0627 \u062A\u064F\u062C\u0645\u0639 \u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u0639\u0628\u0631 \u0627\u0644\u062A\u0648\u0627\u0631\u064A\u062E. \u0627\u0644\u0646\u0633\u0628 \u0645\u0646 \u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A\u0627\u062A \u0648\u0644\u064A\u0633\u062A \u0645\u062C\u0645\u0648\u0639 \u0646\u0633\u0628 \u0627\u0644\u0639\u0645\u0644\u0627\u0621."
    },
    "definitionVersion": 1
  },
  "overdue_receivable_percentage": {
    "shortDefinition": {
      "en": "Total Overdue divided by Net Aged Receivable; zero denominator gives no value.",
      "ar": "\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0630\u0645\u0645 \u0627\u0644\u0645\u062A\u0623\u062E\u0631\u0629 \u0645\u0642\u0633\u0648\u0645\u0627\u064B \u0639\u0644\u0649 \u0635\u0627\u0641\u064A \u0627\u0644\u0630\u0645\u0645 \u062D\u0633\u0628 \u0627\u0644\u0639\u0645\u0631\u061B \u0644\u0627 \u062A\u064F\u062D\u0633\u0628 \u0627\u0644\u0646\u0633\u0628\u0629 \u0639\u0646\u062F \u0645\u0642\u0627\u0645 \u0635\u0641\u0631\u064A."
    },
    "definition": {
      "en": "Total Overdue divided by Net Aged Receivable; zero denominator gives no value. Historical residual is reconstructed through cutoff; payments after cutoff do not change that historical balance.",
      "ar": "\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0630\u0645\u0645 \u0627\u0644\u0645\u062A\u0623\u062E\u0631\u0629 \u0645\u0642\u0633\u0648\u0645\u0627\u064B \u0639\u0644\u0649 \u0635\u0627\u0641\u064A \u0627\u0644\u0630\u0645\u0645 \u062D\u0633\u0628 \u0627\u0644\u0639\u0645\u0631\u061B \u0644\u0627 \u062A\u064F\u062D\u0633\u0628 \u0627\u0644\u0646\u0633\u0628\u0629 \u0639\u0646\u062F \u0645\u0642\u0627\u0645 \u0635\u0641\u0631\u064A. \u064A\u064F\u0639\u0627\u062F \u0628\u0646\u0627\u0621 \u0627\u0644\u0631\u0635\u064A\u062F \u0627\u0644\u0645\u062A\u0628\u0642\u064A \u062D\u062A\u0649 \u0627\u0644\u0642\u0637\u0639\u061B \u0627\u0644\u062F\u0641\u0639\u0627\u062A \u0627\u0644\u0644\u0627\u062D\u0642\u0629 \u0644\u0627 \u062A\u063A\u064A\u0631 \u0630\u0644\u0643 \u0627\u0644\u0631\u0635\u064A\u062F \u0627\u0644\u062A\u0627\u0631\u064A\u062E\u064A."
    },
    "formula": {
      "en": "Total Overdue \xF7 Net Aged Receivable \xD7 100",
      "ar": "\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0630\u0645\u0645 \u0627\u0644\u0645\u062A\u0623\u062E\u0631\u0629 \xF7 \u0635\u0627\u0641\u064A \u0627\u0644\u0630\u0645\u0645 \u062D\u0633\u0628 \u0627\u0644\u0639\u0645\u0631 \xD7 \u0661\u0660\u0660"
    },
    "inclusionSummary": {
      "en": "Posted customer receivable journal items, including invoice, journal/payment and credit-note balances.",
      "ar": "\u0628\u0646\u0648\u062F \u0627\u0644\u0630\u0645\u0645 \u0627\u0644\u0645\u062F\u064A\u0646\u0629 \u0627\u0644\u0645\u064F\u0631\u062D\u0651\u0644\u0629 \u0644\u0644\u0639\u0645\u0644\u0627\u0621\u060C \u0628\u0645\u0627 \u0641\u064A\u0647\u0627 \u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u0641\u0648\u0627\u062A\u064A\u0631 \u0648\u0627\u0644\u0642\u064A\u0648\u062F \u0648\u0627\u0644\u062F\u0641\u0639\u0627\u062A \u0648\u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0627\u0644\u062F\u0627\u0626\u0646\u0629."
    },
    "exclusionSummary": {
      "en": "Draft/cancelled documents, non-receivable accounts, later accounting entries and settlements effective after cutoff.",
      "ar": "\u0627\u0644\u0645\u0633\u0648\u062F\u0627\u062A \u0648\u0627\u0644\u0645\u0633\u062A\u0646\u062F\u0627\u062A \u0627\u0644\u0645\u0644\u063A\u0627\u0629 \u0648\u0627\u0644\u062D\u0633\u0627\u0628\u0627\u062A \u063A\u064A\u0631 \u0627\u0644\u0645\u062F\u064A\u0646\u0629 \u0648\u0627\u0644\u0642\u064A\u0648\u062F \u0648\u0627\u0644\u062A\u0633\u0648\u064A\u0627\u062A \u0627\u0644\u0641\u0639\u0651\u0627\u0644\u0629 \u0628\u0639\u062F \u0627\u0644\u0642\u0637\u0639."
    },
    "dateBasis": {
      "en": "Inclusive accounting cutoff. Age by maturity date, falling back to journal-item accounting date. Due exactly on cutoff belongs to At Date.",
      "ar": "\u0642\u0637\u0639 \u0645\u062D\u0627\u0633\u0628\u064A \u0634\u0627\u0645\u0644. \u0627\u0644\u0639\u0645\u0631 \u062D\u0633\u0628 \u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0627\u0633\u062A\u062D\u0642\u0627\u0642\u060C \u0645\u0639 \u0627\u0644\u0631\u062C\u0648\u0639 \u0625\u0644\u0649 \u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0642\u064A\u062F \u0639\u0646\u062F \u063A\u064A\u0627\u0628\u0647. \u0627\u0644\u0645\u0633\u062A\u062D\u0642 \u0641\u064A \u064A\u0648\u0645 \u0627\u0644\u0642\u0637\u0639 \u064A\u062F\u062E\u0644 \u0641\u064A \u0634\u0631\u064A\u062D\u0629 \u063A\u064A\u0631 \u0627\u0644\u0645\u062A\u0623\u062E\u0631."
    },
    "refundCreditBehavior": {
      "en": "Signed customer credits remain in their own aging buckets; no arbitrary allocation. Gross positive components and credit balances remain distinct.",
      "ar": "\u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u062F\u0627\u0626\u0646\u0629 \u0627\u0644\u0645\u0648\u0642\u0651\u0639\u0629 \u062A\u0628\u0642\u0649 \u0641\u064A \u0634\u0631\u0627\u0626\u062D \u0623\u0639\u0645\u0627\u0631\u0647\u0627 \u062F\u0648\u0646 \u062A\u062E\u0635\u064A\u0635 \u0627\u0639\u062A\u0628\u0627\u0637\u064A. \u0627\u0644\u0645\u0643\u0648\u0646\u0627\u062A \u0627\u0644\u0645\u0648\u062C\u0628\u0629 \u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A\u0629 \u0645\u0633\u062A\u0642\u0644\u0629 \u0639\u0646 \u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u062F\u0627\u0626\u0646\u0629."
    },
    "aggregationBehavior": {
      "en": "One cutoff; never sum balances across dates. Ratios use aggregates, never summed customer percentages.",
      "ar": "\u062A\u0627\u0631\u064A\u062E \u0642\u0637\u0639 \u0648\u0627\u062D\u062F\u061B \u0644\u0627 \u062A\u064F\u062C\u0645\u0639 \u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u0639\u0628\u0631 \u0627\u0644\u062A\u0648\u0627\u0631\u064A\u062E. \u0627\u0644\u0646\u0633\u0628 \u0645\u0646 \u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A\u0627\u062A \u0648\u0644\u064A\u0633\u062A \u0645\u062C\u0645\u0648\u0639 \u0646\u0633\u0628 \u0627\u0644\u0639\u0645\u0644\u0627\u0621."
    },
    "definitionVersion": 1
  }
};

// packages/domain/src/metric-help.ts
var text = (en, ar) => ({ en, ar });
var meanings = {
  revenue: text("Eligible sales revenue before separately recorded adjustments.", "\u0625\u064A\u0631\u0627\u062F\u0627\u062A \u0627\u0644\u0645\u0628\u064A\u0639\u0627\u062A \u0627\u0644\u0645\u0624\u0647\u0644\u0629 \u0642\u0628\u0644 \u0627\u0644\u062A\u0633\u0648\u064A\u0627\u062A \u0627\u0644\u0645\u0633\u062C\u0644\u0629 \u0628\u0635\u0648\u0631\u0629 \u0645\u0646\u0641\u0635\u0644\u0629."),
  net_revenue: text("Sales revenue after governed sales adjustments.", "\u0625\u064A\u0631\u0627\u062F\u0627\u062A \u0627\u0644\u0645\u0628\u064A\u0639\u0627\u062A \u0628\u0639\u062F \u062A\u0633\u0648\u064A\u0627\u062A \u0627\u0644\u0645\u0628\u064A\u0639\u0627\u062A \u0627\u0644\u0645\u0639\u062A\u0645\u062F\u0629."),
  units_sold: text("Sold quantities in compatible units of measure.", "\u0627\u0644\u0643\u0645\u064A\u0627\u062A \u0627\u0644\u0645\u0628\u0627\u0639\u0629 \u0628\u0648\u062D\u062F\u0627\u062A \u0642\u064A\u0627\u0633 \u0645\u062A\u0648\u0627\u0641\u0642\u0629."),
  gross_profit: text("Revenue less the governed cost of goods. Accounting cost policy requires separate approval for a production source.", "\u0627\u0644\u0625\u064A\u0631\u0627\u062F\u0627\u062A \u0646\u0627\u0642\u0635 \u062A\u0643\u0644\u0641\u0629 \u0627\u0644\u0628\u0636\u0627\u0639\u0629 \u0627\u0644\u0645\u0639\u062A\u0645\u062F\u0629. \u0633\u064A\u0627\u0633\u0629 \u0627\u0644\u062A\u0643\u0644\u0641\u0629 \u0627\u0644\u0645\u062D\u0627\u0633\u0628\u064A\u0629 \u062A\u062A\u0637\u0644\u0628 \u0627\u0639\u062A\u0645\u0627\u062F\u0627\u064B \u0645\u0633\u062A\u0642\u0644\u0627\u064B \u0644\u0644\u0645\u0635\u062F\u0631 \u0627\u0644\u0641\u0639\u0644\u064A."),
  gross_margin: text("Gross profit divided by net revenue, expressed as a percentage.", "\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0631\u0628\u062D \u0645\u0642\u0633\u0648\u0645\u0627\u064B \u0639\u0644\u0649 \u0635\u0627\u0641\u064A \u0627\u0644\u0625\u064A\u0631\u0627\u062F\u0627\u062A \u0643\u0646\u0633\u0628\u0629 \u0645\u0626\u0648\u064A\u0629."),
  opportunity_count: text("Number of eligible sales opportunities.", "\u0639\u062F\u062F \u0641\u0631\u0635 \u0627\u0644\u0645\u0628\u064A\u0639\u0627\u062A \u0627\u0644\u0645\u0624\u0647\u0644\u0629."),
  pipeline_value: text("Value of eligible open sales opportunities.", "\u0642\u064A\u0645\u0629 \u0641\u0631\u0635 \u0627\u0644\u0645\u0628\u064A\u0639\u0627\u062A \u0627\u0644\u0645\u0641\u062A\u0648\u062D\u0629 \u0627\u0644\u0645\u0624\u0647\u0644\u0629."),
  weighted_pipeline: text("Opportunity value weighted by its governed probability.", "\u0642\u064A\u0645\u0629 \u0627\u0644\u0641\u0631\u0635 \u0645\u0631\u062C\u0651\u062D\u0629 \u0628\u0627\u062D\u062A\u0645\u0627\u0644\u0647\u0627 \u0627\u0644\u0645\u0639\u062A\u0645\u062F."),
  win_rate: text("Won opportunities divided by closed opportunities.", "\u0627\u0644\u0641\u0631\u0635 \u0627\u0644\u0631\u0627\u0628\u062D\u0629 \u0645\u0642\u0633\u0648\u0645\u0629 \u0639\u0644\u0649 \u0627\u0644\u0641\u0631\u0635 \u0627\u0644\u0645\u063A\u0644\u0642\u0629."),
  invoiced_amount: text("Eligible invoiced amounts under the source-specific approved invoice basis.", "\u0642\u064A\u0645\u0629 \u0627\u0644\u0641\u0648\u0627\u062A\u064A\u0631 \u0627\u0644\u0645\u0624\u0647\u0644\u0629 \u0648\u0641\u0642 \u0623\u0633\u0627\u0633 \u0627\u0644\u0641\u0648\u062A\u0631\u0629 \u0627\u0644\u0645\u0639\u062A\u0645\u062F \u0644\u0644\u0645\u0635\u062F\u0631."),
  collected_amount: text("Eligible collected payment amounts; this does not by itself establish cash-flow or settlement policy.", "\u0645\u0628\u0627\u0644\u063A \u0627\u0644\u062F\u0641\u0639\u0627\u062A \u0627\u0644\u0645\u062D\u0635\u0644\u0629 \u0627\u0644\u0645\u0624\u0647\u0644\u0629\u061B \u0644\u0627 \u064A\u062D\u062F\u062F \u0647\u0630\u0627 \u0648\u062D\u062F\u0647 \u0633\u064A\u0627\u0633\u0629 \u0627\u0644\u062A\u062F\u0641\u0642\u0627\u062A \u0627\u0644\u0646\u0642\u062F\u064A\u0629 \u0623\u0648 \u0627\u0644\u062A\u0633\u0648\u064A\u0629."),
  outstanding_amount: text("Legacy source-defined outstanding balance at cutoff; distinct from Net Aged Receivable and gross open components.", "\u0627\u0644\u0631\u0635\u064A\u062F \u0627\u0644\u0645\u0633\u062A\u062D\u0642 \u0648\u0641\u0642 \u0627\u0644\u062A\u0639\u0631\u064A\u0641 \u0627\u0644\u0633\u0627\u0628\u0642 \u0644\u0644\u0645\u0635\u062F\u0631 \u0639\u0646\u062F \u0627\u0644\u0642\u0637\u0639\u061B \u064A\u062E\u062A\u0644\u0641 \u0639\u0646 \u0635\u0627\u0641\u064A \u0627\u0644\u0630\u0645\u0645 \u062D\u0633\u0628 \u0627\u0644\u0639\u0645\u0631 \u0648\u0645\u0643\u0648\u0646\u0627\u062A \u0627\u0644\u0630\u0645\u0645 \u0627\u0644\u0645\u0641\u062A\u0648\u062D\u0629 \u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A\u0629."),
  overdue_amount: text("Legacy source-defined overdue balance at cutoff; distinct from the signed aging report.", "\u0627\u0644\u0631\u0635\u064A\u062F \u0627\u0644\u0645\u062A\u0623\u062E\u0631 \u0648\u0641\u0642 \u0627\u0644\u062A\u0639\u0631\u064A\u0641 \u0627\u0644\u0633\u0627\u0628\u0642 \u0644\u0644\u0645\u0635\u062F\u0631 \u0639\u0646\u062F \u0627\u0644\u0642\u0637\u0639\u061B \u064A\u062E\u062A\u0644\u0641 \u0639\u0646 \u062A\u0642\u0631\u064A\u0631 \u0627\u0644\u0623\u0639\u0645\u0627\u0631 \u0630\u064A \u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u0645\u0648\u0642\u0651\u0639\u0629."),
  stock_on_hand: text("Eligible stock quantity at cutoff, in compatible product units.", "\u0643\u0645\u064A\u0629 \u0627\u0644\u0645\u062E\u0632\u0648\u0646 \u0627\u0644\u0645\u0624\u0647\u0644\u0629 \u0639\u0646\u062F \u0627\u0644\u0642\u0637\u0639 \u0628\u0648\u062D\u062F\u0627\u062A \u0627\u0644\u0645\u0646\u062A\u062C \u0627\u0644\u0645\u062A\u0648\u0627\u0641\u0642\u0629."),
  inventory_value: text("Stock value at cutoff under the approved valuation basis.", "\u0642\u064A\u0645\u0629 \u0627\u0644\u0645\u062E\u0632\u0648\u0646 \u0639\u0646\u062F \u0627\u0644\u0642\u0637\u0639 \u0648\u0641\u0642 \u0623\u0633\u0627\u0633 \u0627\u0644\u062A\u0642\u064A\u064A\u0645 \u0627\u0644\u0645\u0639\u062A\u0645\u062F."),
  low_stock_count: text("Count of eligible stock positions below the governed threshold at cutoff.", "\u0639\u062F\u062F \u0645\u0648\u0627\u0642\u0639 \u0627\u0644\u0645\u062E\u0632\u0648\u0646 \u0627\u0644\u0645\u0624\u0647\u0644\u0629 \u062F\u0648\u0646 \u0627\u0644\u062D\u062F \u0627\u0644\u0645\u0639\u062A\u0645\u062F \u0639\u0646\u062F \u0627\u0644\u0642\u0637\u0639."),
  maintenance_requests: text("Number of eligible maintenance requests in the reporting period.", "\u0639\u062F\u062F \u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0635\u064A\u0627\u0646\u0629 \u0627\u0644\u0645\u0624\u0647\u0644\u0629 \u062E\u0644\u0627\u0644 \u0641\u062A\u0631\u0629 \u0627\u0644\u062A\u0642\u0631\u064A\u0631."),
  failure_count: text("Number of recorded eligible failures in the reporting period.", "\u0639\u062F\u062F \u0627\u0644\u0623\u0639\u0637\u0627\u0644 \u0627\u0644\u0645\u0633\u062C\u0644\u0629 \u0627\u0644\u0645\u0624\u0647\u0644\u0629 \u062E\u0644\u0627\u0644 \u0641\u062A\u0631\u0629 \u0627\u0644\u062A\u0642\u0631\u064A\u0631."),
  maintenance_cost: text("Eligible maintenance costs recognized in the reporting period.", "\u062A\u0643\u0627\u0644\u064A\u0641 \u0627\u0644\u0635\u064A\u0627\u0646\u0629 \u0627\u0644\u0645\u0624\u0647\u0644\u0629 \u0627\u0644\u0645\u0639\u062A\u0631\u0641 \u0628\u0647\u0627 \u062E\u0644\u0627\u0644 \u0641\u062A\u0631\u0629 \u0627\u0644\u062A\u0642\u0631\u064A\u0631."),
  mtbf: text("Operating hours divided by recorded failures.", "\u0633\u0627\u0639\u0627\u062A \u0627\u0644\u062A\u0634\u063A\u064A\u0644 \u0645\u0642\u0633\u0648\u0645\u0629 \u0639\u0644\u0649 \u0627\u0644\u0623\u0639\u0637\u0627\u0644 \u0627\u0644\u0645\u0633\u062C\u0644\u0629."),
  mttr: text("Repair hours divided by completed repairs.", "\u0633\u0627\u0639\u0627\u062A \u0627\u0644\u0625\u0635\u0644\u0627\u062D \u0645\u0642\u0633\u0648\u0645\u0629 \u0639\u0644\u0649 \u0627\u0644\u0625\u0635\u0644\u0627\u062D\u0627\u062A \u0627\u0644\u0645\u0643\u062A\u0645\u0644\u0629."),
  average_order_value: text("Sales revenue divided by order count.", "\u0625\u064A\u0631\u0627\u062F\u0627\u062A \u0627\u0644\u0645\u0628\u064A\u0639\u0627\u062A \u0645\u0642\u0633\u0648\u0645\u0629 \u0639\u0644\u0649 \u0639\u062F\u062F \u0627\u0644\u0637\u0644\u0628\u0627\u062A."),
  sales_growth: text("Change in revenue relative to the comparison period; null when the prior value is zero or missing.", "\u062A\u063A\u064A\u0631 \u0627\u0644\u0625\u064A\u0631\u0627\u062F\u0627\u062A \u0645\u0642\u0627\u0631\u0646\u0629 \u0628\u0627\u0644\u0641\u062A\u0631\u0629 \u0627\u0644\u0645\u0631\u062C\u0639\u064A\u0629\u061B \u0644\u0627 \u062A\u064F\u062D\u0633\u0628 \u0627\u0644\u0646\u0633\u0628\u0629 \u0625\u0630\u0627 \u0643\u0627\u0646\u062A \u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u0633\u0627\u0628\u0642\u0629 \u0635\u0641\u0631\u0627\u064B \u0623\u0648 \u0645\u0641\u0642\u0648\u062F\u0629."),
  customers_served: text("Distinct stable customers with eligible orders; unassigned identities are excluded.", "\u0639\u062F\u062F \u0627\u0644\u0639\u0645\u0644\u0627\u0621 \u0630\u0648\u064A \u0627\u0644\u0647\u0648\u064A\u0629 \u0627\u0644\u062B\u0627\u0628\u062A\u0629 \u0648\u0627\u0644\u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0645\u0624\u0647\u0644\u0629 \u062F\u0648\u0646 \u0627\u0644\u0647\u0648\u064A\u0627\u062A \u063A\u064A\u0631 \u0627\u0644\u0645\u0639\u064A\u0651\u0646\u0629.")
};
function aggregation(semantics2) {
  if (semantics2.kind === "snapshot") return text("Latest eligible balance per stable entity at cutoff; sum across entities, never across dates.", "\u0622\u062E\u0631 \u0631\u0635\u064A\u062F \u0645\u0624\u0647\u0644 \u0644\u0643\u0644 \u0647\u0648\u064A\u0629 \u062B\u0627\u0628\u062A\u0629 \u0639\u0646\u062F \u0627\u0644\u0642\u0637\u0639\u061B \u064A\u064F\u062C\u0645\u0639 \u0639\u0628\u0631 \u0627\u0644\u0647\u0648\u064A\u0627\u062A \u0648\u0644\u0627 \u064A\u064F\u062C\u0645\u0639 \u0639\u0628\u0631 \u0627\u0644\u062A\u0648\u0627\u0631\u064A\u062E.");
  if (semantics2.kind === "ratio" || semantics2.kind === "duration_derived") return text("Divide aggregated numerator by aggregated denominator; zero denominator returns no value. Never sum individual averages or percentages.", "\u0642\u0633\u0645\u0629 \u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0628\u0633\u0637 \u0639\u0644\u0649 \u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0645\u0642\u0627\u0645\u061B \u0627\u0644\u0645\u0642\u0627\u0645 \u0627\u0644\u0635\u0641\u0631\u064A \u064A\u0639\u0637\u064A \u0642\u064A\u0645\u0629 \u063A\u064A\u0631 \u0645\u062A\u0627\u062D\u0629. \u0644\u0627 \u062A\u064F\u062C\u0645\u0639 \u0627\u0644\u0645\u062A\u0648\u0633\u0637\u0627\u062A \u0627\u0644\u0641\u0631\u062F\u064A\u0629 \u0623\u0648 \u0627\u0644\u0646\u0633\u0628.");
  if (semantics2.kind === "distinct_count") return text("Count each stable identity once within the selected scope.", "\u0639\u062F\u0651 \u0643\u0644 \u0647\u0648\u064A\u0629 \u062B\u0627\u0628\u062A\u0629 \u0645\u0631\u0629 \u0648\u0627\u062D\u062F\u0629 \u0636\u0645\u0646 \u0627\u0644\u0646\u0637\u0627\u0642 \u0627\u0644\u0645\u062E\u062A\u0627\u0631.");
  return text("Aggregate eligible contributions within the selected period and filters.", "\u062A\u062C\u0645\u064A\u0639 \u0627\u0644\u0645\u0633\u0627\u0647\u0645\u0627\u062A \u0627\u0644\u0645\u0624\u0647\u0644\u0629 \u062E\u0644\u0627\u0644 \u0627\u0644\u0641\u062A\u0631\u0629 \u0648\u0627\u0644\u0641\u0644\u0627\u062A\u0631 \u0627\u0644\u0645\u062E\u062A\u0627\u0631\u0629.");
}
function metricHelp(id, labels, semantics2) {
  const content = metricHelpContent[id];
  const definition = content?.definition ?? meanings[id];
  if (!definition) throw new Error(`Metric help missing: ${id}`);
  const metricType = semantics2.kind === "snapshot" ? "snapshot" : ["additive", "distinct_count"].includes(semantics2.kind) ? "event" : "derived";
  return {
    shortDefinition: content?.shortDefinition ?? definition,
    definition,
    formula: content?.formula ?? definition,
    inclusionSummary: content?.inclusionSummary ?? text("Eligible canonical contributions under the governed source mapping.", "\u0627\u0644\u0645\u0633\u0627\u0647\u0645\u0627\u062A \u0627\u0644\u0645\u0639\u062A\u0645\u062F\u0629 \u0627\u0644\u0645\u0624\u0647\u0644\u0629 \u0648\u0641\u0642 \u0631\u0628\u0637 \u0627\u0644\u0645\u0635\u062F\u0631 \u0627\u0644\u0645\u062D\u0643\u0648\u0645."),
    exclusionSummary: content?.exclusionSummary ?? text("Ineligible source states and records outside the authorized scope.", "\u062D\u0627\u0644\u0627\u062A \u0627\u0644\u0645\u0635\u062F\u0631 \u063A\u064A\u0631 \u0627\u0644\u0645\u0624\u0647\u0644\u0629 \u0648\u0627\u0644\u0633\u062C\u0644\u0627\u062A \u062E\u0627\u0631\u062C \u0627\u0644\u0646\u0637\u0627\u0642 \u0627\u0644\u0645\u0635\u0631\u062D \u0628\u0647."),
    dateBasis: content?.dateBasis ?? (metricType === "snapshot" ? text("Selected cutoff date.", "\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0642\u0637\u0639 \u0627\u0644\u0645\u062E\u062A\u0627\u0631.") : text("Governed business recognition date within the reporting period.", "\u062A\u0627\u0631\u064A\u062E \u0627\u0644\u0627\u0639\u062A\u0631\u0627\u0641 \u0628\u0627\u0644\u0623\u0639\u0645\u0627\u0644 \u0627\u0644\u0645\u0639\u062A\u0645\u062F \u0636\u0645\u0646 \u0641\u062A\u0631\u0629 \u0627\u0644\u062A\u0642\u0631\u064A\u0631.")),
    refundCreditBehavior: content?.refundCreditBehavior ?? text("Use only the governed signed contributions for this definition; no inferred credit allocation.", "\u062A\u064F\u0633\u062A\u062E\u062F\u0645 \u0627\u0644\u0645\u0633\u0627\u0647\u0645\u0627\u062A \u0627\u0644\u0645\u0648\u0642\u0651\u0639\u0629 \u0627\u0644\u0645\u0639\u062A\u0645\u062F\u0629 \u0644\u0647\u0630\u0627 \u0627\u0644\u062A\u0639\u0631\u064A\u0641 \u0641\u0642\u0637 \u062F\u0648\u0646 \u062A\u062E\u0635\u064A\u0635 \u062F\u0627\u0626\u0646 \u0645\u0641\u062A\u0631\u0636."),
    aggregationBehavior: content?.aggregationBehavior ?? aggregation(semantics2),
    definitionVersion: content?.definitionVersion ?? 1,
    metricType,
    ...id === "sales_growth" ? { formula: text(`${labels.en}: revenue change \xF7 absolute prior revenue \xD7 100`, `${labels.ar}: \u062A\u063A\u064A\u0631 \u0627\u0644\u0625\u064A\u0631\u0627\u062F\u0627\u062A \xF7 \u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u0645\u0637\u0644\u0642\u0629 \u0644\u0644\u0625\u064A\u0631\u0627\u062F\u0627\u062A \u0627\u0644\u0633\u0627\u0628\u0642\u0629 \xD7 \u0661\u0660\u0660`) } : {}
  };
}

// packages/domain/src/catalog.ts
var dimensions = [
  "date",
  "month",
  "quarter",
  "year",
  "customer",
  "branch",
  "region",
  "salesperson",
  "product",
  "product_category",
  "warehouse",
  "equipment",
  "equipment_category",
  "technician",
  "business_line",
  "city",
  "state"
];
var timeDimensions = ["date", "month", "quarter", "year"];
var categoricalDimensions = dimensions.filter((dimension) => !timeDimensions.includes(dimension));
var time = [...timeDimensions];
var sales = [...time, "customer", "branch", "region", "salesperson", "product", "product_category", "business_line", "city", "state"];
var crm = [...time, "customer", "branch", "region", "salesperson"];
var finance = [...time, "customer", "branch", "region"];
var inventory = [...time, "product", "product_category", "warehouse", "branch"];
var transactions = [...time, "customer", "salesperson", "business_line", "city", "state"];
var maintenance = [...time, "equipment", "equipment_category", "technician", "branch"];
var semantics = {
  net_aged_receivable: { kind: "snapshot", measure: "net_aged_receivable" },
  aged_at_date: { kind: "snapshot", measure: "aged_at_date" },
  aged_1_30: { kind: "snapshot", measure: "aged_1_30" },
  aged_31_60: { kind: "snapshot", measure: "aged_31_60" },
  aged_61_90: { kind: "snapshot", measure: "aged_61_90" },
  aged_91_120: { kind: "snapshot", measure: "aged_91_120" },
  aged_over_120: { kind: "snapshot", measure: "aged_over_120" },
  total_overdue_receivable: { kind: "snapshot", measure: "total_overdue_receivable" },
  gross_open_receivable_components: { kind: "snapshot", measure: "gross_open_receivable_components" },
  credit_balances: { kind: "snapshot", measure: "credit_balances" },
  overdue_receivable_percentage: { kind: "ratio", numerator: "total_overdue_receivable", denominator: "net_aged_receivable", scale: 100, basis: "snapshot" },
  customers_served: { kind: "distinct_count", measure: "order_count", dimension: "customer" },
  order_revenue: { kind: "additive", measure: "order_revenue" },
  net_invoiced_revenue: { kind: "additive", measure: "net_invoiced_revenue" },
  invoiced_revenue: { kind: "additive", measure: "invoiced_revenue" },
  refund_value: { kind: "additive", measure: "refund_value" },
  invoice_count: { kind: "additive", measure: "invoice_count" },
  refund_count: { kind: "additive", measure: "refund_count" },
  cancelled_orders: { kind: "additive", measure: "cancelled_orders" },
  average_invoice_value: { kind: "ratio", numerator: "invoiced_revenue", denominator: "invoice_count", scale: 1 },
  average_confirmed_order_value: { kind: "ratio", numerator: "order_revenue", denominator: "order_count", scale: 1 },
  revenue: { kind: "additive", measure: "revenue" },
  net_revenue: { kind: "additive", measure: "net_revenue" },
  order_count: { kind: "additive", measure: "order_count" },
  units_sold: { kind: "additive", measure: "units_sold" },
  average_order_value: { kind: "ratio", numerator: "revenue", denominator: "order_count", scale: 1 },
  gross_profit: { kind: "additive", measure: "gross_profit" },
  gross_margin: { kind: "ratio", numerator: "gross_profit", denominator: "net_revenue", scale: 100 },
  sales_growth: { kind: "comparison_derived", base: "revenue", defaultComparison: "previous_period" },
  opportunity_count: { kind: "additive", measure: "opportunity_count" },
  pipeline_value: { kind: "additive", measure: "pipeline_value" },
  weighted_pipeline: { kind: "additive", measure: "weighted_pipeline" },
  win_rate: { kind: "ratio", numerator: "won_opportunity_count", denominator: "closed_opportunity_count", scale: 100 },
  invoiced_amount: { kind: "additive", measure: "invoiced_amount" },
  collected_amount: { kind: "additive", measure: "collected_amount" },
  outstanding_amount: { kind: "snapshot", measure: "outstanding_amount" },
  overdue_amount: { kind: "snapshot", measure: "overdue_amount" },
  stock_on_hand: { kind: "snapshot", measure: "stock_on_hand" },
  inventory_value: { kind: "snapshot", measure: "inventory_value" },
  low_stock_count: { kind: "snapshot", measure: "low_stock_count" },
  maintenance_requests: { kind: "additive", measure: "maintenance_requests" },
  failure_count: { kind: "additive", measure: "failure_count" },
  mtbf: { kind: "duration_derived", numerator: "operating_hours", denominator: "failure_count", scale: 1 },
  mttr: { kind: "duration_derived", numerator: "repair_hours", denominator: "completed_repair_count", scale: 1 },
  maintenance_cost: { kind: "additive", measure: "maintenance_cost" }
};
var definitions = [
  ["net_aged_receivable", "Net Aged Receivable", "\u0635\u0627\u0641\u064A \u0627\u0644\u0630\u0645\u0645 \u0627\u0644\u0645\u062F\u064A\u0646\u0629 \u062D\u0633\u0628 \u0627\u0644\u0639\u0645\u0631", "currency", ["customer", "month"], [], []],
  ["aged_at_date", "At-Date Receivable", "\u0627\u0644\u0630\u0645\u0645 \u063A\u064A\u0631 \u0627\u0644\u0645\u062A\u0623\u062E\u0631\u0629 \u0639\u0646\u062F \u0627\u0644\u0642\u0637\u0639", "currency", ["customer", "month"], [], []],
  ["aged_1_30", "1\u201330 Overdue", "\u0645\u062A\u0623\u062E\u0631 \u0645\u0646 \u0661 \u0625\u0644\u0649 \u0663\u0660 \u064A\u0648\u0645\u0627\u064B", "currency", ["customer", "month"], [], []],
  ["aged_31_60", "31\u201360 Overdue", "\u0645\u062A\u0623\u062E\u0631 \u0645\u0646 \u0663\u0661 \u0625\u0644\u0649 \u0666\u0660 \u064A\u0648\u0645\u0627\u064B", "currency", ["customer", "month"], [], []],
  ["aged_61_90", "61\u201390 Overdue", "\u0645\u062A\u0623\u062E\u0631 \u0645\u0646 \u0666\u0661 \u0625\u0644\u0649 \u0669\u0660 \u064A\u0648\u0645\u0627\u064B", "currency", ["customer", "month"], [], []],
  ["aged_91_120", "91\u2013120 Overdue", "\u0645\u062A\u0623\u062E\u0631 \u0645\u0646 \u0669\u0661 \u0625\u0644\u0649 \u0661\u0662\u0660 \u064A\u0648\u0645\u0627\u064B", "currency", ["customer", "month"], [], []],
  ["aged_over_120", "Older than 120", "\u0645\u062A\u0623\u062E\u0631 \u0623\u0643\u062B\u0631 \u0645\u0646 \u0661\u0662\u0660 \u064A\u0648\u0645\u0627\u064B", "currency", ["customer", "month"], [], []],
  ["total_overdue_receivable", "Total Overdue", "\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0630\u0645\u0645 \u0627\u0644\u0645\u062A\u0623\u062E\u0631\u0629", "currency", ["customer", "month"], [], []],
  ["gross_open_receivable_components", "Gross Open Receivable Components", "\u0645\u0643\u0648\u0646\u0627\u062A \u0627\u0644\u0630\u0645\u0645 \u0627\u0644\u0645\u0641\u062A\u0648\u062D\u0629 \u0627\u0644\u0625\u062C\u0645\u0627\u0644\u064A\u0629", "currency", ["customer", "month"], [], []],
  ["credit_balances", "Credit Balances", "\u0627\u0644\u0623\u0631\u0635\u062F\u0629 \u0627\u0644\u062F\u0627\u0626\u0646\u0629", "currency", ["customer", "month"], [], []],
  ["overdue_receivable_percentage", "Overdue %", "\u0646\u0633\u0628\u0629 \u0627\u0644\u0630\u0645\u0645 \u0627\u0644\u0645\u062A\u0623\u062E\u0631\u0629", "percentage", ["customer", "month"], [], []],
  ["customers_served", "Customers / outlets served", "\u0627\u0644\u0639\u0645\u0644\u0627\u0621 / \u0627\u0644\u0645\u0646\u0627\u0641\u0630 \u0627\u0644\u0645\u062E\u062F\u0648\u0645\u0629", "number", sales, [], []],
  ["order_revenue", "Order revenue", "\u0625\u064A\u0631\u0627\u062F\u0627\u062A \u0627\u0644\u0637\u0644\u0628\u0627\u062A", "currency", transactions, [], ["\u0642\u064A\u0645\u0629 \u0627\u0644\u0637\u0644\u0628\u0627\u062A"]],
  ["net_invoiced_revenue", "Net invoiced revenue", "\u0635\u0627\u0641\u064A \u0625\u064A\u0631\u0627\u062F\u0627\u062A \u0627\u0644\u0641\u0648\u0627\u062A\u064A\u0631", "currency", transactions, [], ["\u0635\u0627\u0641\u064A \u0627\u0644\u0641\u0648\u0627\u062A\u064A\u0631"]],
  ["invoiced_revenue", "Invoiced revenue", "\u0625\u064A\u0631\u0627\u062F\u0627\u062A \u0627\u0644\u0641\u0648\u0627\u062A\u064A\u0631", "currency", transactions, [], []],
  ["refund_value", "Refund value", "\u0642\u064A\u0645\u0629 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0627\u0644\u062F\u0627\u0626\u0646\u0629", "currency", transactions, [], []],
  ["invoice_count", "Invoice count", "\u0639\u062F\u062F \u0627\u0644\u0641\u0648\u0627\u062A\u064A\u0631", "number", transactions, [], []],
  ["refund_count", "Refund count", "\u0639\u062F\u062F \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0627\u0644\u062F\u0627\u0626\u0646\u0629", "number", transactions, [], []],
  ["cancelled_orders", "Cancelled orders", "\u0627\u0644\u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0645\u0644\u063A\u0627\u0629", "number", transactions, [], []],
  ["average_invoice_value", "Average invoice value", "\u0645\u062A\u0648\u0633\u0637 \u0642\u064A\u0645\u0629 \u0627\u0644\u0641\u0627\u062A\u0648\u0631\u0629", "currency", transactions, [], []],
  ["average_confirmed_order_value", "Average confirmed order value", "\u0645\u062A\u0648\u0633\u0637 \u0642\u064A\u0645\u0629 \u0627\u0644\u0637\u0644\u0628 \u0627\u0644\u0645\u0624\u0643\u062F", "currency", sales, [], []],
  ["revenue", "Revenue", "\u0627\u0644\u0625\u064A\u0631\u0627\u062F\u0627\u062A", "currency", sales, ["sales", "turnover"], ["\u0627\u0644\u0645\u0628\u064A\u0639\u0627\u062A", "\u0642\u064A\u0645\u0629 \u0627\u0644\u0645\u0628\u064A\u0639\u0627\u062A"]],
  ["net_revenue", "Net revenue", "\u0635\u0627\u0641\u064A \u0627\u0644\u0625\u064A\u0631\u0627\u062F\u0627\u062A", "currency", sales, ["net sales"], ["\u0635\u0627\u0641\u064A \u0627\u0644\u0645\u0628\u064A\u0639\u0627\u062A"]],
  ["order_count", "Orders", "\u0639\u062F\u062F \u0627\u0644\u0637\u0644\u0628\u0627\u062A", "number", sales, ["sales orders"], ["\u0627\u0644\u0637\u0644\u0628\u0627\u062A"]],
  ["units_sold", "Units sold", "\u0627\u0644\u0648\u062D\u062F\u0627\u062A \u0627\u0644\u0645\u0628\u0627\u0639\u0629", "number", sales, ["quantity sold"], ["\u0627\u0644\u0643\u0645\u064A\u0629 \u0627\u0644\u0645\u0628\u0627\u0639\u0629"]],
  ["average_order_value", "Average order value", "\u0645\u062A\u0648\u0633\u0637 \u0642\u064A\u0645\u0629 \u0627\u0644\u0637\u0644\u0628", "currency", sales, ["AOV"], ["\u0645\u062A\u0648\u0633\u0637 \u0627\u0644\u0637\u0644\u0628"]],
  ["gross_profit", "Gross profit", "\u0625\u062C\u0645\u0627\u0644\u064A \u0627\u0644\u0631\u0628\u062D", "currency", sales, ["profit"], ["\u0627\u0644\u0631\u0628\u062D"]],
  ["gross_margin", "Gross margin", "\u0647\u0627\u0645\u0634 \u0627\u0644\u0631\u0628\u062D", "percentage", sales, ["margin"], ["\u0646\u0633\u0628\u0629 \u0627\u0644\u0631\u0628\u062D"]],
  ["sales_growth", "Sales growth", "\u0646\u0645\u0648 \u0627\u0644\u0645\u0628\u064A\u0639\u0627\u062A", "percentage", sales, ["revenue growth"], ["\u0646\u0645\u0648 \u0627\u0644\u0625\u064A\u0631\u0627\u062F\u0627\u062A"]],
  ["opportunity_count", "Opportunities", "\u0639\u062F\u062F \u0627\u0644\u0641\u0631\u0635", "number", crm, ["leads"], ["\u0627\u0644\u0641\u0631\u0635"]],
  ["pipeline_value", "Pipeline value", "\u0642\u064A\u0645\u0629 \u0627\u0644\u0641\u0631\u0635", "currency", crm, ["pipeline"], ["\u0642\u064A\u0645\u0629 \u062E\u0637 \u0627\u0644\u0645\u0628\u064A\u0639\u0627\u062A"]],
  ["weighted_pipeline", "Weighted pipeline", "\u0642\u064A\u0645\u0629 \u0627\u0644\u0641\u0631\u0635 \u0627\u0644\u0645\u0631\u062C\u062D\u0629", "currency", crm, ["weighted opportunities"], ["\u0627\u0644\u0641\u0631\u0635 \u0627\u0644\u0645\u0631\u062C\u062D\u0629"]],
  ["win_rate", "Win rate", "\u0645\u0639\u062F\u0644 \u0627\u0644\u0641\u0648\u0632", "percentage", crm, ["conversion rate"], ["\u0645\u0639\u062F\u0644 \u0627\u0644\u062A\u062D\u0648\u064A\u0644"]],
  ["invoiced_amount", "Invoiced amount", "\u0642\u064A\u0645\u0629 \u0627\u0644\u0641\u0648\u0627\u062A\u064A\u0631", "currency", finance, ["invoices"], ["\u0627\u0644\u0641\u0648\u0627\u062A\u064A\u0631"]],
  ["collected_amount", "Collected amount", "\u0627\u0644\u0645\u0628\u0627\u0644\u063A \u0627\u0644\u0645\u062D\u0635\u0644\u0629", "currency", finance, ["payments"], ["\u0627\u0644\u062A\u062D\u0635\u064A\u0644\u0627\u062A"]],
  ["outstanding_amount", "Outstanding amount", "\u0627\u0644\u0645\u0628\u0627\u0644\u063A \u0627\u0644\u0645\u0633\u062A\u062D\u0642\u0629", "currency", finance, ["receivables"], ["\u0627\u0644\u0645\u062F\u064A\u0648\u0646\u064A\u0627\u062A"]],
  ["overdue_amount", "Overdue amount", "\u0627\u0644\u0645\u0628\u0627\u0644\u063A \u0627\u0644\u0645\u062A\u0623\u062E\u0631\u0629", "currency", finance, ["overdue receivables"], ["\u0627\u0644\u0645\u062A\u0623\u062E\u0631\u0627\u062A"]],
  ["stock_on_hand", "Stock on hand", "\u0627\u0644\u0645\u062E\u0632\u0648\u0646 \u0627\u0644\u0645\u062A\u0627\u062D", "number", inventory, ["inventory quantity"], ["\u0643\u0645\u064A\u0629 \u0627\u0644\u0645\u062E\u0632\u0648\u0646"]],
  ["inventory_value", "Inventory value", "\u0642\u064A\u0645\u0629 \u0627\u0644\u0645\u062E\u0632\u0648\u0646", "currency", inventory, ["stock value"], ["\u0642\u064A\u0645\u0629 \u0627\u0644\u0628\u0636\u0627\u0639\u0629"]],
  ["low_stock_count", "Low stock products", "\u0645\u0646\u062A\u062C\u0627\u062A \u0645\u0646\u062E\u0641\u0636\u0629 \u0627\u0644\u0645\u062E\u0632\u0648\u0646", "number", inventory, ["stockouts"], ["\u0627\u0644\u0646\u0648\u0627\u0642\u0635"]],
  ["maintenance_requests", "Maintenance requests", "\u0637\u0644\u0628\u0627\u062A \u0627\u0644\u0635\u064A\u0627\u0646\u0629", "number", maintenance, ["work orders"], ["\u0628\u0644\u0627\u063A\u0627\u062A \u0627\u0644\u0635\u064A\u0627\u0646\u0629"]],
  ["failure_count", "Failures", "\u0639\u062F\u062F \u0627\u0644\u0623\u0639\u0637\u0627\u0644", "number", maintenance, ["breakdowns"], ["\u0627\u0644\u0623\u0639\u0637\u0627\u0644"]],
  ["mtbf", "Mean time between failures", "\u0645\u062A\u0648\u0633\u0637 \u0627\u0644\u0632\u0645\u0646 \u0628\u064A\u0646 \u0627\u0644\u0623\u0639\u0637\u0627\u0644", "duration", maintenance, ["MTBF"], ["\u0645\u062A\u0648\u0633\u0637 \u0627\u0644\u0648\u0642\u062A \u0628\u064A\u0646 \u0627\u0644\u0623\u0639\u0637\u0627\u0644"]],
  ["mttr", "Mean time to repair", "\u0645\u062A\u0648\u0633\u0637 \u0632\u0645\u0646 \u0627\u0644\u0625\u0635\u0644\u0627\u062D", "duration", maintenance, ["MTTR"], ["\u0645\u062A\u0648\u0633\u0637 \u0648\u0642\u062A \u0627\u0644\u0625\u0635\u0644\u0627\u062D"]],
  ["maintenance_cost", "Maintenance cost", "\u062A\u0643\u0644\u0641\u0629 \u0627\u0644\u0635\u064A\u0627\u0646\u0629", "currency", maintenance, ["repair cost"], ["\u062A\u0643\u0627\u0644\u064A\u0641 \u0627\u0644\u0635\u064A\u0627\u0646\u0629"]]
];
var dialectSynonyms = {
  revenue: { iq: ["\u0627\u0644\u0645\u0628\u064A\u0639\u0627\u062A", "\u0627\u0644\u0628\u064A\u0639", "\u0634\u0643\u062F \u0628\u0627\u064A\u0639\u064A\u0646"], eg: ["\u0627\u0644\u0645\u0628\u064A\u0639\u0627\u062A", "\u0627\u0644\u0628\u064A\u0639"] },
  outstanding_amount: { iq: ["\u0627\u0644\u0645\u0628\u0627\u0644\u063A \u0639\u0644\u0649 \u0627\u0644\u0632\u0628\u0627\u0626\u0646", "\u0627\u0644\u062F\u064A\u0648\u0646", "\u0627\u0644\u0645\u0628\u0627\u0644\u063A \u0627\u0644\u0628\u0627\u0642\u064A\u0629"], eg: ["\u0627\u0644\u0645\u062F\u064A\u0648\u0646\u064A\u0627\u062A", "\u0627\u0644\u0645\u0628\u0627\u0644\u063A \u0639\u0644\u0649 \u0627\u0644\u0639\u0645\u0644\u0627\u0621", "\u0627\u0644\u0641\u0644\u0648\u0633 \u0627\u0644\u0645\u0633\u062A\u062D\u0642\u0629"] },
  order_count: { iq: ["\u0639\u062F\u062F \u0627\u0644\u0637\u0644\u0628\u064A\u0627\u062A"], eg: ["\u0639\u062F\u062F \u0627\u0644\u0623\u0648\u0631\u062F\u0631\u0627\u062A"] },
  collected_amount: { iq: ["\u0627\u0644\u0645\u0628\u0627\u0644\u063A \u0627\u0644\u0645\u0642\u0628\u0648\u0636\u0629"], eg: ["\u0627\u0644\u0641\u0644\u0648\u0633 \u0627\u0644\u0645\u062A\u062D\u0635\u0644\u0629"] }
};
var semanticCatalog = Object.fromEntries(
  definitions.map(([id, en, ar, type, supportedDimensions, enSynonyms, arSynonyms]) => [id, {
    id,
    labels: { en, ar },
    descriptions: metricHelp(id, { en, ar }, semantics[id]).shortDefinition,
    synonyms: { en: enSynonyms, ar: arSynonyms },
    ...dialectSynonyms[id] ? { dialectSynonyms: dialectSynonyms[id] } : {},
    type,
    semantics: semantics[id],
    help: metricHelp(id, { en, ar }, semantics[id]),
    dimensions: supportedDimensions,
    presentation: { decimals: type === "number" ? 0 : 2, ...type === "duration" ? { unit: "hours" } : type === "percentage" ? { unit: "%" } : {} }
  }])
);
var factIds = /* @__PURE__ */ new Set([
  ...Object.values(semantics).flatMap((s) => s.kind === "additive" || s.kind === "snapshot" || s.kind === "distinct_count" ? [s.measure] : []),
  "won_opportunity_count",
  "closed_opportunity_count",
  "operating_hours",
  "repair_hours",
  "completed_repair_count"
]);
var factMeasureIds = [...factIds];
function isMetricId(id) {
  return Object.hasOwn(semanticCatalog, id);
}
function isFactMeasureId(id) {
  return factIds.has(id);
}
function requiredMeasures(id) {
  const s = semanticCatalog[id].semantics;
  if (s.kind === "additive" || s.kind === "snapshot" || s.kind === "distinct_count") return [s.measure];
  if (s.kind === "ratio" || s.kind === "duration_derived") return [s.numerator, s.denominator];
  return requiredMeasures(s.base);
}

// packages/domain/src/validation.ts
var import__ = __toESM(require__(), 1);
var import_ajv_formats = __toESM(require_dist(), 1);

// packages/domain/src/dashboard-spec-v2.schema.json
var dashboard_spec_v2_schema_default = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://el-dabboos.example/schemas/dashboard-spec/v2",
  title: "DashboardSpec v2",
  type: "object",
  additionalProperties: false,
  required: [
    "schemaVersion",
    "id",
    "title",
    "locale",
    "filters",
    "layout",
    "widgets"
  ],
  properties: {
    schemaVersion: {
      const: 2
    },
    id: {
      $ref: "#/$defs/id"
    },
    title: {
      $ref: "#/$defs/text"
    },
    locale: {
      enum: [
        "en",
        "ar"
      ]
    },
    filters: {
      $ref: "#/$defs/filters"
    },
    layout: {
      $ref: "#/$defs/layout"
    },
    widgets: {
      type: "array",
      minItems: 1,
      maxItems: 30,
      items: {
        $ref: "#/$defs/widget"
      }
    },
    presentation: {
      $ref: "#/$defs/dashboardPresentation"
    }
  },
  $defs: {
    id: {
      type: "string",
      pattern: "^[a-z0-9][a-z0-9_-]*$",
      maxLength: 80
    },
    text: {
      type: "object",
      additionalProperties: false,
      required: [
        "en",
        "ar"
      ],
      properties: {
        en: {
          type: "string",
          minLength: 1
        },
        ar: {
          type: "string",
          minLength: 1
        }
      }
    },
    dateRange: {
      type: "object",
      additionalProperties: false,
      required: [
        "from",
        "to"
      ],
      properties: {
        from: {
          type: "string",
          format: "date"
        },
        to: {
          type: "string",
          format: "date"
        }
      }
    },
    filter: {
      type: "object",
      additionalProperties: false,
      required: [
        "dimension",
        "values"
      ],
      properties: {
        dimension: {
          type: "string"
        },
        values: {
          type: "array",
          minItems: 1,
          items: {
            type: "string"
          }
        }
      }
    },
    filters: {
      type: "object",
      additionalProperties: false,
      properties: {
        dateRange: {
          $ref: "#/$defs/dateRange"
        },
        dimensions: {
          type: "array",
          items: {
            $ref: "#/$defs/filter"
          }
        },
        datePreset: {
          enum: [
            "today",
            "yesterday",
            "current_month",
            "previous_month",
            "last_30_days",
            "last_90_days",
            "current_quarter",
            "previous_quarter",
            "current_year",
            "previous_year",
            "last_6_months",
            "last_12_months"
          ]
        }
      },
      not: {
        required: [
          "dateRange",
          "datePreset"
        ]
      }
    },
    widget: {
      type: "object",
      additionalProperties: false,
      required: [
        "id",
        "type",
        "series"
      ],
      properties: {
        id: {
          $ref: "#/$defs/id"
        },
        type: {
          enum: [
            "kpi",
            "line",
            "area",
            "bar",
            "pie",
            "treemap",
            "combo",
            "table"
          ]
        },
        title: {
          $ref: "#/$defs/text"
        },
        dimension: {
          type: "string"
        },
        series: {
          type: "array",
          minItems: 1,
          maxItems: 8,
          items: {
            $ref: "#/$defs/series"
          }
        },
        presentation: {
          $ref: "#/$defs/presentation"
        }
      }
    },
    analysis: {
      type: "object",
      additionalProperties: false,
      properties: {
        comparison: {
          enum: [
            "previous_period",
            "month_over_month",
            "year_over_year"
          ]
        },
        movingAverage: {
          type: "object",
          additionalProperties: false,
          required: [
            "window"
          ],
          properties: {
            window: {
              type: "integer",
              minimum: 2,
              maximum: 24
            }
          }
        },
        runningTotal: {
          const: true
        },
        percentageContribution: {
          const: true
        },
        ranking: {
          const: true
        },
        topN: {
          type: "object",
          additionalProperties: false,
          required: [
            "direction",
            "limit"
          ],
          properties: {
            direction: {
              enum: [
                "top",
                "bottom"
              ]
            },
            limit: {
              type: "integer",
              minimum: 1,
              maximum: 100
            }
          }
        }
      }
    },
    series: {
      type: "object",
      additionalProperties: false,
      required: [
        "id",
        "metric"
      ],
      properties: {
        id: {
          $ref: "#/$defs/id"
        },
        metric: {
          type: "string"
        },
        analysis: {
          $ref: "#/$defs/analysis"
        },
        presentation: {
          type: "object",
          additionalProperties: false,
          properties: {
            mark: {
              enum: [
                "bar",
                "line"
              ]
            }
          }
        }
      }
    },
    gridItem: {
      type: "object",
      additionalProperties: false,
      required: [
        "widgetId",
        "x",
        "y",
        "w",
        "h"
      ],
      properties: {
        widgetId: {
          $ref: "#/$defs/id"
        },
        x: {
          type: "integer",
          minimum: 0,
          maximum: 11
        },
        y: {
          type: "integer",
          minimum: 0,
          maximum: 200
        },
        w: {
          type: "integer",
          minimum: 1,
          maximum: 12
        },
        h: {
          type: "integer",
          minimum: 1,
          maximum: 20
        },
        minW: {
          type: "integer",
          minimum: 1,
          maximum: 12
        },
        minH: {
          type: "integer",
          minimum: 1,
          maximum: 20
        }
      }
    },
    layout: {
      type: "object",
      additionalProperties: false,
      required: [
        "columns"
      ],
      properties: {
        columns: {
          enum: [
            1,
            2,
            3,
            4,
            12
          ]
        },
        items: {
          type: "array",
          maxItems: 30,
          items: {
            $ref: "#/$defs/gridItem"
          }
        }
      }
    },
    presentation: {
      type: "object",
      additionalProperties: false,
      properties: {
        orientation: {
          enum: [
            "vertical",
            "horizontal"
          ]
        },
        pieVariant: {
          enum: [
            "pie",
            "donut"
          ]
        },
        legend: {
          enum: [
            "auto",
            "show",
            "hide"
          ]
        },
        dataLabels: {
          enum: [
            "auto",
            "show",
            "hide"
          ]
        },
        curve: {
          enum: [
            "straight",
            "smooth"
          ]
        },
        palette: {
          enum: [
            "default",
            "blue",
            "green",
            "orange",
            "purple",
            "red",
            "neutral"
          ]
        }
      }
    },
    dashboardPresentation: {
      type: "object",
      additionalProperties: false,
      properties: {
        palette: {
          enum: [
            "default",
            "blue",
            "green",
            "orange",
            "purple",
            "red",
            "neutral"
          ]
        }
      }
    }
  }
};

// packages/domain/src/dashboard-patch-v2.schema.json
var dashboard_patch_v2_schema_default = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://el-dabboos.example/schemas/dashboard-patch/v2",
  title: "DashboardPatch v2",
  type: "object",
  additionalProperties: false,
  required: [
    "schemaVersion",
    "operations"
  ],
  properties: {
    schemaVersion: {
      const: 2
    },
    operations: {
      type: "array",
      minItems: 1,
      maxItems: 30,
      items: {
        oneOf: [
          {
            type: "object",
            additionalProperties: false,
            required: [
              "op",
              "widget"
            ],
            properties: {
              op: {
                const: "add"
              },
              widget: {
                $ref: "#/$defs/widget"
              }
            }
          },
          {
            type: "object",
            additionalProperties: false,
            required: [
              "op",
              "widgetId"
            ],
            properties: {
              op: {
                const: "remove"
              },
              widgetId: {
                $ref: "#/$defs/id"
              }
            }
          },
          {
            type: "object",
            additionalProperties: false,
            required: [
              "op",
              "widgetId",
              "widget"
            ],
            properties: {
              op: {
                const: "replace"
              },
              widgetId: {
                $ref: "#/$defs/id"
              },
              widget: {
                $ref: "#/$defs/widget"
              }
            }
          },
          {
            type: "object",
            additionalProperties: false,
            required: [
              "op",
              "title"
            ],
            properties: {
              op: {
                const: "set_title"
              },
              title: {
                $ref: "#/$defs/text"
              }
            }
          },
          {
            type: "object",
            additionalProperties: false,
            required: [
              "op",
              "filters"
            ],
            properties: {
              op: {
                const: "set_filters"
              },
              filters: {
                $ref: "#/$defs/filters"
              }
            }
          },
          {
            type: "object",
            additionalProperties: false,
            required: [
              "op",
              "layout"
            ],
            properties: {
              op: {
                const: "set_layout"
              },
              layout: {
                $ref: "#/$defs/layout"
              }
            }
          },
          {
            type: "object",
            additionalProperties: false,
            required: [
              "op",
              "presentation"
            ],
            properties: {
              op: {
                const: "set_presentation"
              },
              presentation: {
                anyOf: [
                  {
                    $ref: "#/$defs/dashboardPresentation"
                  },
                  {
                    type: "null"
                  }
                ]
              }
            }
          }
        ]
      }
    }
  },
  $defs: {
    id: {
      type: "string",
      pattern: "^[a-z0-9][a-z0-9_-]*$",
      maxLength: 80
    },
    text: {
      type: "object",
      additionalProperties: false,
      required: [
        "en",
        "ar"
      ],
      properties: {
        en: {
          type: "string",
          minLength: 1
        },
        ar: {
          type: "string",
          minLength: 1
        }
      }
    },
    dateRange: {
      type: "object",
      additionalProperties: false,
      required: [
        "from",
        "to"
      ],
      properties: {
        from: {
          type: "string",
          format: "date"
        },
        to: {
          type: "string",
          format: "date"
        }
      }
    },
    filter: {
      type: "object",
      additionalProperties: false,
      required: [
        "dimension",
        "values"
      ],
      properties: {
        dimension: {
          type: "string"
        },
        values: {
          type: "array",
          minItems: 1,
          items: {
            type: "string"
          }
        }
      }
    },
    filters: {
      type: "object",
      additionalProperties: false,
      properties: {
        dateRange: {
          $ref: "#/$defs/dateRange"
        },
        dimensions: {
          type: "array",
          items: {
            $ref: "#/$defs/filter"
          }
        },
        datePreset: {
          enum: [
            "today",
            "yesterday",
            "current_month",
            "previous_month",
            "last_30_days",
            "last_90_days",
            "current_quarter",
            "previous_quarter",
            "current_year",
            "previous_year",
            "last_6_months",
            "last_12_months"
          ]
        }
      },
      not: {
        required: [
          "dateRange",
          "datePreset"
        ]
      }
    },
    widget: {
      type: "object",
      additionalProperties: false,
      required: [
        "id",
        "type",
        "series"
      ],
      properties: {
        id: {
          $ref: "#/$defs/id"
        },
        type: {
          enum: [
            "kpi",
            "line",
            "area",
            "bar",
            "pie",
            "treemap",
            "combo",
            "table"
          ]
        },
        title: {
          $ref: "#/$defs/text"
        },
        dimension: {
          type: "string"
        },
        series: {
          type: "array",
          minItems: 1,
          maxItems: 8,
          items: {
            $ref: "#/$defs/series"
          }
        },
        presentation: {
          $ref: "#/$defs/presentation"
        }
      }
    },
    analysis: {
      type: "object",
      additionalProperties: false,
      properties: {
        comparison: {
          enum: [
            "previous_period",
            "month_over_month",
            "year_over_year"
          ]
        },
        movingAverage: {
          type: "object",
          additionalProperties: false,
          required: [
            "window"
          ],
          properties: {
            window: {
              type: "integer",
              minimum: 2,
              maximum: 24
            }
          }
        },
        runningTotal: {
          const: true
        },
        percentageContribution: {
          const: true
        },
        ranking: {
          const: true
        },
        topN: {
          type: "object",
          additionalProperties: false,
          required: [
            "direction",
            "limit"
          ],
          properties: {
            direction: {
              enum: [
                "top",
                "bottom"
              ]
            },
            limit: {
              type: "integer",
              minimum: 1,
              maximum: 100
            }
          }
        }
      }
    },
    series: {
      type: "object",
      additionalProperties: false,
      required: [
        "id",
        "metric"
      ],
      properties: {
        id: {
          $ref: "#/$defs/id"
        },
        metric: {
          type: "string"
        },
        analysis: {
          $ref: "#/$defs/analysis"
        },
        presentation: {
          type: "object",
          additionalProperties: false,
          properties: {
            mark: {
              enum: [
                "bar",
                "line"
              ]
            }
          }
        }
      }
    },
    gridItem: {
      type: "object",
      additionalProperties: false,
      required: [
        "widgetId",
        "x",
        "y",
        "w",
        "h"
      ],
      properties: {
        widgetId: {
          $ref: "#/$defs/id"
        },
        x: {
          type: "integer",
          minimum: 0,
          maximum: 11
        },
        y: {
          type: "integer",
          minimum: 0,
          maximum: 200
        },
        w: {
          type: "integer",
          minimum: 1,
          maximum: 12
        },
        h: {
          type: "integer",
          minimum: 1,
          maximum: 20
        },
        minW: {
          type: "integer",
          minimum: 1,
          maximum: 12
        },
        minH: {
          type: "integer",
          minimum: 1,
          maximum: 20
        }
      }
    },
    layout: {
      type: "object",
      additionalProperties: false,
      required: [
        "columns"
      ],
      properties: {
        columns: {
          enum: [
            1,
            2,
            3,
            4,
            12
          ]
        },
        items: {
          type: "array",
          maxItems: 30,
          items: {
            $ref: "#/$defs/gridItem"
          }
        }
      }
    },
    presentation: {
      type: "object",
      additionalProperties: false,
      properties: {
        orientation: {
          enum: [
            "vertical",
            "horizontal"
          ]
        },
        pieVariant: {
          enum: [
            "pie",
            "donut"
          ]
        },
        legend: {
          enum: [
            "auto",
            "show",
            "hide"
          ]
        },
        dataLabels: {
          enum: [
            "auto",
            "show",
            "hide"
          ]
        },
        curve: {
          enum: [
            "straight",
            "smooth"
          ]
        },
        palette: {
          enum: [
            "default",
            "blue",
            "green",
            "orange",
            "purple",
            "red",
            "neutral"
          ]
        }
      }
    },
    dashboardPresentation: {
      type: "object",
      additionalProperties: false,
      properties: {
        palette: {
          enum: [
            "default",
            "blue",
            "green",
            "orange",
            "purple",
            "red",
            "neutral"
          ]
        }
      }
    }
  }
};

// packages/domain/src/validation.ts
var AjvClass = import__.default.default ?? import__.default;
var addFormatsFn = import_ajv_formats.default.default ?? import_ajv_formats.default;
var ajv = new AjvClass({ allErrors: true });
addFormatsFn(ajv);
var checkDashboardSchema = ajv.compile(dashboard_spec_v2_schema_default);
var checkPatchSchema = ajv.compile(dashboard_patch_v2_schema_default);
var record = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
var exactKeys = (v, allowed, required = []) => Object.keys(v).every((k) => allowed.includes(k)) && required.every((k) => Object.hasOwn(v, k));
var validDate = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`)) && (/* @__PURE__ */ new Date(`${v}T00:00:00Z`)).toISOString().slice(0, 10) === v;
var validDateRange = (v) => record(v) && exactKeys(v, ["from", "to"], ["from", "to"]) && validDate(v.from) && validDate(v.to) && v.from <= v.to;

// packages/domain/src/metric-registry.ts
var domainFor = (id) => {
  if (["opportunity_count", "pipeline_value", "weighted_pipeline", "win_rate"].includes(id)) return "crm";
  if (id.startsWith("aged_") || ["net_aged_receivable", "total_overdue_receivable", "overdue_receivable_percentage", "gross_open_receivable_components", "credit_balances"].includes(id)) return "finance";
  if (["invoiced_amount", "collected_amount", "outstanding_amount", "overdue_amount"].includes(id)) return "finance";
  if (["stock_on_hand", "inventory_value", "low_stock_count"].includes(id)) return "inventory";
  if (["maintenance_requests", "failure_count", "mtbf", "mttr", "maintenance_cost"].includes(id)) return "maintenance";
  return "sales";
};
var planned = (id, domain, en, ar, reason) => ({ id, availability: "planned", domain, labels: { en, ar }, reason });
var productMetricCatalog = [
  ...Object.values(semanticCatalog).map((metric) => ({ id: metric.id, availability: "available", domain: domainFor(metric.id), labels: metric.labels })),
  planned("days_sales_outstanding", "finance", "Days sales outstanding", "\u0623\u064A\u0627\u0645 \u062A\u062D\u0635\u064A\u0644 \u0627\u0644\u0645\u0628\u064A\u0639\u0627\u062A", "Requires approved receivables and credit-sales definitions."),
  planned("receivables_aging", "finance", "Receivables aging", "\u0623\u0639\u0645\u0627\u0631 \u0627\u0644\u0630\u0645\u0645 \u0627\u0644\u0645\u062F\u064A\u0646\u0629", "Requires invoice due dates and approved aging buckets."),
  planned("customer_retention", "customers", "Customer retention", "\u0627\u0644\u0627\u062D\u062A\u0641\u0627\u0638 \u0628\u0627\u0644\u0639\u0645\u0644\u0627\u0621", "Requires an approved active-customer cohort definition."),
  planned("customer_churn", "customers", "Customer churn", "\u062A\u0633\u0631\u0628 \u0627\u0644\u0639\u0645\u0644\u0627\u0621", "Requires an approved churn definition."),
  planned("customer_lifetime_value", "customers", "Customer lifetime value", "\u0627\u0644\u0642\u064A\u0645\u0629 \u0627\u0644\u062F\u0627\u0626\u0645\u0629 \u0644\u0644\u0639\u0645\u064A\u0644", "Requires approved customer revenue and cost attribution."),
  planned("repeat_purchase_rate", "customers", "Repeat purchase rate", "\u0645\u0639\u062F\u0644 \u0627\u0644\u0634\u0631\u0627\u0621 \u0627\u0644\u0645\u062A\u0643\u0631\u0631", "Requires an approved customer/order cohort definition."),
  planned("inventory_turnover", "inventory", "Inventory turnover", "\u062F\u0648\u0631\u0627\u0646 \u0627\u0644\u0645\u062E\u0632\u0648\u0646", "Requires approved cost-of-goods and average-inventory values."),
  planned("days_inventory_outstanding", "inventory", "Days inventory outstanding", "\u0623\u064A\u0627\u0645 \u0628\u0642\u0627\u0621 \u0627\u0644\u0645\u062E\u0632\u0648\u0646", "Requires approved inventory valuation and cost of goods."),
  planned("stockout_rate", "inventory", "Stockout rate", "\u0645\u0639\u062F\u0644 \u0646\u0641\u0627\u062F \u0627\u0644\u0645\u062E\u0632\u0648\u0646", "Requires stock availability history."),
  planned("dead_stock", "inventory", "Dead stock", "\u0627\u0644\u0645\u062E\u0632\u0648\u0646 \u0627\u0644\u0631\u0627\u0643\u062F", "Requires an approved inactivity period and stock history."),
  planned("supplier_spend", "purchasing", "Supplier spend", "\u0627\u0644\u0625\u0646\u0641\u0627\u0642 \u0639\u0644\u0649 \u0627\u0644\u0645\u0648\u0631\u062F\u064A\u0646", "Requires purchasing source measures."),
  planned("supplier_lead_time", "purchasing", "Supplier lead time", "\u0645\u062F\u0629 \u062A\u0648\u0631\u064A\u062F \u0627\u0644\u0645\u0648\u0631\u062F", "Requires purchase and delivery timestamps."),
  planned("on_time_supplier_delivery", "purchasing", "On-time supplier delivery", "\u0627\u0644\u062A\u0633\u0644\u064A\u0645 \u0641\u064A \u0627\u0644\u0645\u0648\u0639\u062F \u0645\u0646 \u0627\u0644\u0645\u0648\u0631\u062F\u064A\u0646", "Requires promised and actual delivery dates."),
  planned("customer_profitability", "customers", "Customer profitability", "\u0631\u0628\u062D\u064A\u0629 \u0627\u0644\u0639\u0645\u064A\u0644", "Requires approved customer cost attribution."),
  planned("asset_availability", "maintenance", "Asset availability", "\u062C\u0627\u0647\u0632\u064A\u0629 \u0627\u0644\u0623\u0635\u0648\u0644", "Requires scheduled and actual downtime."),
  planned("downtime", "maintenance", "Downtime", "\u0632\u0645\u0646 \u0627\u0644\u062A\u0648\u0642\u0641", "Requires asset outage intervals."),
  planned("maintenance_sla_compliance", "maintenance", "Maintenance SLA compliance", "\u0627\u0644\u0627\u0644\u062A\u0632\u0627\u0645 \u0628\u0645\u0633\u062A\u0648\u0649 \u062E\u062F\u0645\u0629 \u0627\u0644\u0635\u064A\u0627\u0646\u0629", "Requires approved SLA deadlines."),
  planned("preventive_corrective_ratio", "maintenance", "Preventive/corrective maintenance ratio", "\u0646\u0633\u0628\u0629 \u0627\u0644\u0635\u064A\u0627\u0646\u0629 \u0627\u0644\u0648\u0642\u0627\u0626\u064A\u0629 \u0625\u0644\u0649 \u0627\u0644\u062A\u0635\u062D\u064A\u062D\u064A\u0629", "Requires maintenance-type classification.")
];

// packages/domain/src/transaction-evidence.ts
var bounded = (value) => typeof value === "string" && value.length > 0 && value.length <= 500;
var nullable = (value) => value === null || bounded(value);
var decimal = (value) => typeof value === "string" && /^-?(0|[1-9]\d{0,23})\.\d{6}$/.test(value) && value !== "-0.000000";
function validateTransactionEvidence(evidence) {
  const keys = ["sourceCompanyId", "state", "documentType", "paymentState", "untaxedAmount", "taxAmount", "totalAmount", "currency", "labels", "area", "relatedLines"];
  if (!evidence || keys.some((key) => !Object.hasOwn(evidence, key)) || Object.keys(evidence).some((key) => ![...keys, "location"].includes(key))) throw new Error("Invalid transaction evidence shape");
  if (![evidence.sourceCompanyId, evidence.state, evidence.documentType].every(bounded) || !nullable(evidence.paymentState) || !nullable(evidence.area) || !/^[A-Z]{3}$/.test(evidence.currency)) throw new Error("Invalid transaction identity");
  if (![evidence.untaxedAmount, evidence.taxAmount, evidence.totalAmount].every(decimal)) throw new Error("Invalid transaction amounts");
  validateTransactionLabels(evidence);
  validateTransactionLineage(evidence.relatedLines);
}
function validateTransactionLabels(evidence) {
  if (!evidence.labels || Object.keys(evidence.labels).sort().join(",") !== ["customer", "salesperson", "businessLine", "state"].sort().join(",") || !Object.values(evidence.labels).every(nullable)) throw new Error("Invalid transaction labels");
  if (evidence.location !== void 0 && (!evidence.location || Object.keys(evidence.location).sort().join(",") !== "latitude,longitude,shopGps" || !Object.values(evidence.location).every(nullable))) throw new Error("Invalid transaction location");
}
function validateTransactionLineage(lines) {
  if (!Array.isArray(lines) || lines.length > 1e3 || lines.some((line) => Object.keys(line).sort().join(",") !== ["sourceOrderId", "sourceOrderLineId", "sourceInvoiceLineId"].sort().join(",") || !Object.values(line).every(bounded))) throw new Error("Invalid transaction lineage");
}

// packages/domain/src/production-data.ts
function fail(code) {
  throw new Error(`Production data: ${code}`);
}
var object = (v) => !!v && typeof v === "object" && !Array.isArray(v);
var text2 = (v) => typeof v === "string" && v.length > 0 && v.length <= 200 && v.trim() === v;
function shape(v, required, optional = []) {
  if (!object(v) || required.some((k) => !Object.hasOwn(v, k)) || Object.keys(v).some((k) => ![...required, ...optional].includes(k))) fail("invalid_shape");
}
var date = (v) => validDateRange({ from: v, to: v });
var timestamp = (v) => typeof v === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString() === v;
var currencyCode = (v) => typeof v === "string" && /^[A-Z]{3}$/.test(v);
var unsigned = (v) => typeof v === "string" && /^(0|[1-9]\d{0,19})$/.test(v);
var isCanonicalDecimal = (v) => typeof v === "string" && /^-?(0|[1-9]\d{0,23})\.\d{6}$/.test(v) && v !== "-0.000000";
var snapshot = (id) => Object.values(semanticCatalog).some((m) => m.semantics.kind === "snapshot" && m.semantics.measure === id);
var monetary = (id) => Object.values(semanticCatalog).some((m) => m.type === "currency" && requiredMeasures(m.id).includes(id) && m.semantics.kind !== "ratio");
var measureDimensions = (id) => categoricalDimensions.filter((d) => Object.values(semanticCatalog).filter((m) => requiredMeasures(m.id).includes(id)).every((m) => m.dimensions.includes(d)));
function validateSourceMapping(value) {
  shape(value, ["tenantId", "sourceId", "datasetId", "mappingId", "mappingVersion", "businessBasis", "reportingCurrency", "businessOwner", "approval", "measures", "capabilities"]);
  for (const key of ["tenantId", "sourceId", "datasetId", "mappingId", "mappingVersion", "businessBasis", "businessOwner"]) if (!text2(value[key])) fail("mapping_identity");
  if (!currencyCode(value.reportingCurrency)) fail("currency");
  const a = value.approval;
  if (!object(a)) fail("approval");
  if (a.status === "pending") shape(a, ["status"]);
  else {
    shape(a, ["status", "reference", "approvedAt"]);
    if (a.status !== "approved" || !text2(a.reference) || !timestamp(a.approvedAt)) fail("approval");
  }
  if (!Array.isArray(value.measures) || !value.measures.length || value.measures.length > 64) fail("mapping_measures");
  const seen = /* @__PURE__ */ new Set();
  for (const m of value.measures) {
    shape(m, ["measureId", "sourceObject", "grain", "eligibleStates", "recognitionRule", "timeZone", "amountBasis", "taxTreatment", "signConvention", "identityRule", "correctionRule", "currencyPolicy", "dimensionMappings"]);
    if (typeof m.measureId !== "string" || !isFactMeasureId(m.measureId) || seen.has(m.measureId)) fail("invalid_measure");
    seen.add(m.measureId);
    for (const k of ["sourceObject", "grain", "recognitionRule", "timeZone", "amountBasis", "taxTreatment", "signConvention", "identityRule", "correctionRule", "currencyPolicy"]) if (!text2(m[k])) fail("mapping_rule");
    if (!Array.isArray(m.eligibleStates) || m.eligibleStates.length > 32 || !m.eligibleStates.every(text2)) fail("mapping_states");
    if (!object(m.dimensionMappings) || Object.entries(m.dimensionMappings).some(([d, rule]) => !measureDimensions(m.measureId).includes(d) || !text2(rule))) fail("capability");
  }
  if (!Array.isArray(value.capabilities) || !value.capabilities.length || value.capabilities.length > 64) fail("capability");
  const metrics = /* @__PURE__ */ new Set();
  for (const c of value.capabilities) {
    shape(c, ["metric", "dimensions"]);
    if (typeof c.metric !== "string" || !isMetricId(c.metric) || metrics.has(c.metric)) fail("capability");
    metrics.add(c.metric);
    if (!requiredMeasures(c.metric).every((id) => seen.has(id))) fail("capability_inputs");
    if (!Array.isArray(c.dimensions) || new Set(c.dimensions).size !== c.dimensions.length || c.dimensions.some((d) => !semanticCatalog[c.metric].dimensions.includes(d) || categoricalDimensions.includes(d) && !requiredMeasures(c.metric).every((id) => Object.hasOwn(value.measures.find((m) => m.measureId === id).dimensionMappings, d)))) fail("capability");
  }
}
function validateProductionFact(value, mapping) {
  validateSourceMapping(mapping);
  shape(value, ["tenantId", "datasetId", "measureId", "kind", "businessDate", "value", "dimensions", "sourceId", "sourceObject", "sourceRecordId", "componentId", "sourceVersion", "sourceRevision", "mappingId", "mappingVersion", "batchId", "sourceAsOf", "frozenRevision", "status"], ["entityId", "sourceUpdatedAt", "currency", "transaction", "displayLabels"]);
  for (const key of ["tenantId", "datasetId", "sourceId", "sourceObject", "sourceRecordId", "componentId", "sourceVersion", "mappingId", "mappingVersion", "batchId", "frozenRevision"]) if (!text2(value[key])) fail("identity");
  for (const key of ["tenantId", "datasetId", "sourceId", "mappingId", "mappingVersion"]) if (value[key] !== mapping[key]) fail("mapping_scope");
  if (typeof value.measureId !== "string" || !isFactMeasureId(value.measureId)) fail("invalid_measure");
  const rule = mapping.measures.find((m) => m.measureId === value.measureId);
  if (!rule || rule.sourceObject !== value.sourceObject) fail("mapping_measure");
  if (value.kind !== (snapshot(value.measureId) ? "snapshot" : "event")) fail("fact_kind");
  if ((value.kind === "snapshot" || value.entityId !== void 0) && !text2(value.entityId)) fail("snapshot_entity");
  if (!date(value.businessDate)) fail("invalid_date");
  if (!isCanonicalDecimal(value.value)) fail("invalid_numeric");
  if (!unsigned(value.sourceRevision) || !timestamp(value.sourceAsOf) || value.sourceUpdatedAt !== void 0 && !timestamp(value.sourceUpdatedAt)) fail("lineage");
  if (!["active", "tombstone"].includes(String(value.status))) fail("status");
  if (!object(value.dimensions) || Object.entries(value.dimensions).some(([d, v]) => !Object.hasOwn(rule.dimensionMappings, d) || !text2(v))) fail("capability");
  if (value.transaction !== void 0) validateTransactionEvidence(value.transaction);
  validateDisplayLabels(value.displayLabels);
  if (Object.keys(rule.dimensionMappings).some((d) => !Object.hasOwn(value.dimensions, d))) fail("missing_dimension");
  if (!monetary(value.measureId)) {
    if (value.currency !== void 0) fail("unexpected_currency");
    return;
  }
  const c = value.currency;
  if (!object(c)) fail("currency");
  shape(c, ["mode", "transactionCurrency", "transactionValue", "reportingCurrency", "policyReference"], c.mode === "converted" ? ["baseCurrency", "rate", "rateDate", "rateReference"] : ["baseCurrency"]);
  if (!currencyCode(c.transactionCurrency) || !currencyCode(c.reportingCurrency) || c.reportingCurrency !== mapping.reportingCurrency || c.baseCurrency !== void 0 && !currencyCode(c.baseCurrency) || !isCanonicalDecimal(c.transactionValue) || c.policyReference !== rule.currencyPolicy) fail("currency");
  if (c.mode === "native") {
    if (c.transactionCurrency !== c.reportingCurrency || c.transactionValue !== value.value) fail("currency");
  } else if (c.mode === "converted") {
    if (typeof c.rate !== "string" || !/^(0|[1-9]\d{0,11})\.\d{12}$/.test(c.rate) || BigInt(c.rate.replace(".", "")) <= 0n || !date(c.rateDate) || !text2(c.rateReference)) fail("currency_rate");
  } else fail("currency");
}
function validateDisplayLabels(labels) {
  if (labels === void 0) return;
  if (!object(labels) || Object.entries(labels).some(([key, value]) => !["customer", "salesperson", "businessLine"].includes(key) || typeof value !== "string" || !value.trim() || value.length > 500)) fail("display_labels");
}

// node_modules/.pnpm/pg@8.23.1/node_modules/pg/esm/index.mjs
var import_lib = __toESM(require_lib2(), 1);
var Client = import_lib.default.Client;
var Pool = import_lib.default.Pool;
var Connection = import_lib.default.Connection;
var types = import_lib.default.types;
var Query = import_lib.default.Query;
var DatabaseError = import_lib.default.DatabaseError;
var escapeIdentifier = import_lib.default.escapeIdentifier;
var escapeLiteral = import_lib.default.escapeLiteral;
var Result = import_lib.default.Result;
var TypeOverrides = import_lib.default.TypeOverrides;
var defaults = import_lib.default.defaults;

// packages/data/src/postgres/mapping-releases.ts
function certifiedMapping(row) {
  const mapping = row.specification;
  validateSourceMapping(mapping);
  if (row.approval_status !== "approved" || typeof row.approval_reference !== "string" || !(row.approved_at instanceof Date)) throw new Error("Unapproved certification metadata");
  return { ...mapping, approval: { status: "approved", reference: row.approval_reference, approvedAt: row.approved_at.toISOString() } };
}

// packages/data/src/postgres/release-certification.ts
async function assertPublicationOperator(client) {
  const role = (await client.query(`SELECT rolsuper,rolbypassrls,
    pg_has_role(current_user,'dabboos_migrator','MEMBER') migrator,
    pg_has_role(current_user,'dabboos_ingestor','MEMBER') ingestor,
    pg_has_role(current_user,'dabboos_runtime','MEMBER') runtime FROM pg_roles WHERE rolname=current_user`)).rows[0];
  if (!role?.migrator || role.rolsuper || role.rolbypassrls || role.ingestor || role.runtime) throw new Error("Publication requires dedicated migrator authority");
}

// packages/data/src/postgres/release-transfer.ts
async function assertCertifiedRelease(client, scope) {
  await assertPublicationOperator(client);
  const mapping = (await client.query(`SELECT specification FROM mart.mapping_releases WHERE tenant_id=$1 AND dataset_id=$2
    AND approval_status='approved' AND mart.reconciliation_certified(tenant_id,dataset_id,mapping_version,approval_case_ids)
    AND mart.business_certified(tenant_id,dataset_id,approval_reference,approval_case_ids)`, [scope.tenantId, scope.datasetId])).rows[0];
  if (!mapping) throw new Error("Approved certified release required for promotion");
  validateSourceMapping(mapping.specification);
}

// packages/data/src/postgres/published-capabilities.ts
function projectPublishedRelease(mapping, coverage, context, derived = []) {
  if (mapping.tenantId !== context.tenantId || mapping.approval.status !== "approved") throw new Error("Unapproved published scope");
  const certificationReference = mapping.approval.reference;
  const periods = [...new Set(coverage.map((row) => JSON.stringify({ from: row.period_from, to: row.period_to })))];
  const releases = periods.flatMap((periodText) => {
    const period = JSON.parse(periodText);
    const proves = (metric, dimension) => requiredMeasures(metric).every((measure) => coverage.some((row) => row.measure_id === measure && row.grouping === dimension && row.period_from === period.from && row.period_to === period.to && row.exact && Number(row.case_count) > 0));
    const capabilities = mapping.capabilities.flatMap((capability) => {
      const kind = semanticCatalog[capability.metric].semantics.kind;
      const outputProven = (dimension) => kind === "additive" || kind === "snapshot" || kind === "ratio" && derived.some((row) => row.metric === capability.metric && row.grouping === dimension && row.period_from === period.from && row.period_to === period.to);
      if (!outputProven(null) || !proves(capability.metric, null)) return [];
      const dimensions2 = capability.dimensions.filter((dimension) => outputProven(dimension) && proves(capability.metric, dimension));
      if (!(context.enforcedFilters ?? []).every((filter) => dimensions2.includes(filter.dimension))) return [];
      return [{ metric: capability.metric, summary: true, dimensions: dimensions2, analyses: [] }];
    });
    const provenance = { datasetId: mapping.datasetId, sourceId: mapping.sourceId, mappingId: mapping.mappingId, mappingVersion: mapping.mappingVersion, certificationReference };
    const snapshot2 = (metric) => {
      const semantics2 = semanticCatalog[metric].semantics;
      return semantics2.kind === "snapshot" || semantics2.kind === "ratio" && semantics2.basis === "snapshot";
    };
    const events = capabilities.filter((capability) => !snapshot2(capability.metric));
    const balances = capabilities.filter((capability) => snapshot2(capability.metric));
    return [...events.length || !balances.length ? [{ ...provenance, period, capabilities: events }] : [], ...balances.length ? [{ ...provenance, period: { from: period.to, to: period.to }, capabilities: balances }] : []];
  });
  return { tenantId: context.tenantId, mode: "certified", releases };
}

// packages/data/src/operational/definition-version.ts
var import_node_crypto = require("node:crypto");
function operationalDefinitionVersion() {
  return (0, import_node_crypto.createHash)("sha256").update(JSON.stringify(semanticCatalog)).digest("hex");
}

// packages/data/src/operational/certified-baseline.ts
async function certifiedBaseline(client, tenantId, datasets) {
  const mappings = [], releases = [];
  for (const datasetId of datasets) {
    await assertCertifiedRelease(client, { tenantId, datasetId });
    const row = (await client.query("SELECT * FROM mart.mapping_releases WHERE tenant_id=$1 AND dataset_id=$2", [tenantId, datasetId])).rows[0];
    const mapping = certifiedMapping(row);
    mappings.push(mapping);
    releases.push(...await certifiedCapabilities(client, mapping, row.approval_case_ids));
  }
  const first = mappings[0];
  if (!first || mappings.some((mapping) => mapping.sourceId !== first.sourceId || mapping.reportingCurrency !== first.reportingCurrency || mapping.mappingVersion !== first.mappingVersion)) throw new Error("Single approved source/currency/mapping version required");
  const periods = releases.flatMap((release) => release.period ? [release.period] : []);
  if (!periods.length) throw new Error("Exact certified coverage required");
  const from = periods.map((period) => period.from).sort()[0], to = periods.map((period) => period.to).sort().at(-1);
  const capabilities = { tenantId, mode: "certified", releases: [{ ...releases[0], period: { from, to }, capabilities: intersectCapabilities(releases) }] };
  return { partitionCapabilities: monthlyCapabilities(tenantId, releases), tenantId, datasets: [...datasets], sourceId: first.sourceId, reportingCurrency: first.reportingCurrency, mappingVersion: first.mappingVersion, definitionVersion: operationalDefinitionVersion(), mappings: [...new Map(mappings.map((mapping) => [JSON.stringify(mapping.measures), mapping])).values()], capabilities, from: from.slice(0, 7) + "-01", to };
}
async function certifiedCapabilities(client, mapping, caseIds) {
  const coverage = (await client.query(`SELECT specification->>'measureId' measure_id,specification->>'grouping' grouping,
 specification->>'from' period_from,specification->>'to' period_to,
 bool_and(status='passed' AND group_completeness AND (specification->>'expectedValue')::numeric=(specification->>'actualValue')::numeric
 AND (specification->>'expectedCount')::numeric=(specification->>'actualCount')::numeric
 AND (specification->'tolerance'->>'absoluteValue')::numeric=0 AND (specification->'tolerance'->>'absoluteCount')::numeric=0) exact,count(*)::text case_count
 FROM mart.reconciliation_evidence WHERE tenant_id=$1 AND dataset_id=$2 AND case_id=ANY($3::text[]) GROUP BY 1,2,3,4`, [mapping.tenantId, mapping.datasetId, caseIds])).rows;
  if (coverage.some((row) => !row.exact)) throw new Error("Zero-tolerance adoption evidence required");
  const derived = (await client.query(`SELECT metric,grouping,period_from::text,period_to::text,reference FROM mart.derived_metric_certifications
 WHERE tenant_id=$1 AND dataset_id=$2 AND mart.derived_inputs_exact(tenant_id,dataset_id,metric,grouping,period_from,period_to,case_ids)`, [mapping.tenantId, mapping.datasetId])).rows;
  return projectPublishedRelease(mapping, coverage, { tenantId: mapping.tenantId, locale: "en" }, derived).releases;
}
function intersectCapabilities(releases) {
  const metrics = [...new Set(releases.flatMap((release) => release.capabilities.map((capability) => capability.metric)))];
  return metrics.map((metric) => {
    const peers = releases.flatMap((release) => release.capabilities.filter((capability) => capability.metric === metric));
    const first = peers[0], snapshot2 = semanticCatalog[metric].semantics.kind === "snapshot";
    const dimensions2 = first.dimensions.filter((dimension) => peers.every((peer) => peer.dimensions.includes(dimension)));
    return { ...first, dimensions: [.../* @__PURE__ */ new Set([...dimensions2, "month"])], ...!snapshot2 ? { analyses: ["comparison", "movingAverage", "runningTotal", "percentageContribution", "ranking", "topN"], comparisons: ["month_over_month"], analysisDimensions: { comparison: ["month"], movingAverage: ["month"] }, movingAverageWindows: [3, 6] } : {} };
  });
}
function monthlyCapabilities(tenantId, releases) {
  const months = /* @__PURE__ */ new Map();
  for (const release of releases) {
    if (!release.period) continue;
    const start = /* @__PURE__ */ new Date(release.period.from.slice(0, 7) + "-01T00:00:00Z");
    for (; start.toISOString().slice(0, 7) <= release.period.to.slice(0, 7); start.setUTCMonth(start.getUTCMonth() + 1)) {
      const month = start.toISOString().slice(0, 7), peers = months.get(month) ?? [];
      peers.push(release);
      months.set(month, peers);
    }
  }
  return Object.fromEntries([...months].map(([month, peers]) => [month, { tenantId, mode: "certified", releases: [{ ...peers[0], capabilities: intersectCapabilities(peers) }] }]));
}

// packages/data/src/operational/baseline-facts.ts
var import_node_crypto2 = require("node:crypto");

// packages/data/src/postgres/records.ts
var iso = (v) => v instanceof Date ? v.toISOString() : String(v);
function productionFactFromRow(r, m) {
  const f = {
    tenantId: String(r.tenant_id),
    datasetId: String(r.dataset_id),
    measureId: r.measure_id,
    kind: r.kind,
    businessDate: iso(r.business_date).slice(0, 10),
    value: String(r.value),
    dimensions: Object.fromEntries(categoricalDimensions.filter((d) => r[d] != null).map((d) => [d, String(r[d])])),
    sourceId: m.sourceId,
    sourceObject: String(r.source_object),
    sourceRecordId: String(r.source_record_id),
    componentId: String(r.component_id),
    sourceVersion: String(r.source_version),
    sourceRevision: String(r.source_revision),
    mappingId: m.mappingId,
    mappingVersion: m.mappingVersion,
    batchId: String(r.batch_id),
    sourceAsOf: iso(r.source_as_of),
    frozenRevision: String(r.frozen_revision),
    status: r.status,
    ...r.display_labels == null ? {} : { displayLabels: r.display_labels },
    ...r.transaction_evidence == null ? {} : { transaction: r.transaction_evidence },
    ...r.entity_id == null ? {} : { entityId: String(r.entity_id) },
    ...r.source_updated_at == null ? {} : { sourceUpdatedAt: iso(r.source_updated_at) }
  };
  if (r.monetary) f.currency = {
    transactionCurrency: String(r.transaction_currency),
    transactionValue: String(r.transaction_value),
    reportingCurrency: String(r.reporting_currency),
    policyReference: String(r.currency_policy_reference),
    ...r.base_currency == null ? {} : { baseCurrency: String(r.base_currency) },
    ...r.currency_mode === "native" ? { mode: "native" } : { mode: "converted", rate: String(r.conversion_rate), rateDate: iso(r.rate_date).slice(0, 10), rateReference: String(r.rate_reference) }
  };
  return f;
}

// packages/data/src/operational/facts.ts
function operationalFactKey(fact) {
  return JSON.stringify([fact.tenantId, fact.sourceId, fact.sourceObject, fact.sourceRecordId, fact.componentId, fact.measureId, ...fact.kind === "snapshot" ? [fact.entityId, fact.businessDate] : []]);
}

// packages/data/src/operational/baseline-facts.ts
async function copyBaselineFacts(client, baseline, mappings) {
  await client.query(`DECLARE operational_baseline NO SCROLL CURSOR FOR SELECT f.*,f.business_date::text business_date,f.rate_date::text rate_date FROM mart.canonical_facts f WHERE tenant_id=$1 AND dataset_id=ANY($2::text[])
 AND NOT EXISTS(SELECT 1 FROM mart.analytics_trusted_serving trusted JOIN mart.analytics_serving_members member USING(tenant_id,revision_id)
 JOIN mart.analytics_partitions part USING(tenant_id,partition_id),jsonb_array_elements(part.capabilities->'releases') release,jsonb_array_elements(release->'capabilities') capability
 WHERE trusted.tenant_id=f.tenant_id AND member.family='facts' AND member.month=date_trunc('month',f.business_date)::date AND capability->>'metric'=f.measure_id)
 ORDER BY f.dataset_id,f.business_date,f.source_object,f.source_record_id,f.measure_id`, [baseline.tenantId, baseline.datasets]);
  let count = 0;
  try {
    while (true) {
      const rows = (await client.query("FETCH FORWARD 500 FROM operational_baseline")).rows;
      if (!rows.length) break;
      const facts = rows.map((row) => normalizeBaselineFact(productionFactFromRow(row, mappings.find((mapping) => mapping.datasetId === row.dataset_id)), baseline));
      await insertBaselinePage(client, baseline.tenantId, facts);
      count += rows.length;
    }
  } finally {
    await client.query("CLOSE operational_baseline");
  }
  return count;
}
function normalizeBaselineFact(fact, baseline) {
  const mapping = baseline.mappings.find((mapping2) => mapping2.measures.some((rule) => rule.measureId === fact.measureId && rule.sourceObject === fact.sourceObject));
  if (!mapping) throw new Error("Baseline definition conflict");
  const normalized = { ...fact, datasetId: mapping.datasetId, mappingId: mapping.mappingId, mappingVersion: mapping.mappingVersion };
  validateProductionFact(normalized, mapping);
  return normalized;
}
async function insertBaselinePage(client, tenantId, facts) {
  const records = facts.map((fact) => ({ key: operationalFactKey(fact), revision: (0, import_node_crypto2.createHash)("sha256").update(JSON.stringify(fact)).digest("hex"), payload: fact }));
  await client.query(`INSERT INTO mart.analytics_fact_revisions SELECT $1,record.key,record.revision,record.payload FROM jsonb_to_recordset($2::jsonb) record(key text,revision text,payload jsonb) ON CONFLICT DO NOTHING`, [tenantId, JSON.stringify(records)]);
  await client.query(`INSERT INTO mart.analytics_fact_heads(tenant_id,fact_key,revision_id) SELECT $1,record.key,record.revision FROM jsonb_to_recordset($2::jsonb) record(key text,revision text) ON CONFLICT DO NOTHING`, [tenantId, JSON.stringify(records)]);
}

// packages/data/src/operational/aggregates.ts
var import_node_crypto3 = require("node:crypto");

// packages/data/src/operational/baseline.ts
async function readBaseline(client, tenantId) {
  const row = (await client.query("SELECT *,period_from::text AS period_from,period_to::text AS period_to FROM mart.analytics_baselines WHERE tenant_id=$1", [tenantId])).rows[0];
  if (!row) throw new Error("Explicit certified operational bootstrap required");
  if (row.definition_version !== operationalDefinitionVersion()) throw new Error("Explicit metric-definition migration required");
  return { tenantId, sourceId: row.source_id, reportingCurrency: row.reporting_currency, datasets: row.datasets, mappingVersion: row.mapping_version, definitionVersion: row.definition_version, mappings: row.specification, capabilities: row.capabilities, from: date2(row.period_from), to: date2(row.period_to) };
}
var date2 = (value) => value instanceof Date ? value.toISOString().slice(0, 10) : value;

// packages/data/src/operational/aggregate-rollups.ts
async function reconcileEventRollup(client, tenantId, partitionId) {
  const existing = await client.query("SELECT 1 FROM mart.analytics_aggregate_proofs WHERE tenant_id=$1 AND partition_id=$2", [tenantId, partitionId]);
  if (existing.rowCount) return "already-proved";
  await client.query(`INSERT INTO mart.analytics_monthly_bases
 SELECT tenant_id,partition_id,measure_id,dimensions,sum(value),sum(fact_count),max(business_date)
 FROM mart.analytics_aggregate_bases WHERE tenant_id=$1 AND partition_id=$2 AND kind='event' GROUP BY 1,2,3,4`, [tenantId, partitionId]);
  await client.query(`INSERT INTO mart.analytics_aggregate_proofs(tenant_id,partition_id,definition_version,mapping_version,business_timezone,daily_rows,monthly_rows)
 SELECT tenant_id,$2,definition_version,mapping_version,specification->0->'measures'->0->>'timeZone',
 (SELECT count(*) FROM mart.analytics_aggregate_bases WHERE tenant_id=$1 AND partition_id=$2 AND kind='event'),
 (SELECT count(*) FROM mart.analytics_monthly_bases WHERE tenant_id=$1 AND partition_id=$2)
 FROM mart.analytics_baselines WHERE tenant_id=$1`, [tenantId, partitionId]);
  return "proved";
}

// packages/data/src/operational/aggregates.ts
async function refreshOperationalMonths(client, scope, months) {
  const unique = [...new Set(months)].sort();
  await client.query("INSERT INTO mart.analytics_serving_revisions(tenant_id,revision_id,parent_revision,run_id,cutoff,affected_months,purpose) VALUES($1,$2,$3,$4,$5,$6,$7)", [scope.tenantId, scope.revisionId, scope.parent, scope.runId, scope.cutoff, [.../* @__PURE__ */ new Set([...unique, ...scope.additionalAffectedMonths ?? []])].map((month) => `${month}-01`), scope.purpose ?? "operational"]);
  if (scope.parent) await client.query(`INSERT INTO mart.analytics_serving_members SELECT tenant_id,$2,month,partition_id,family FROM mart.analytics_serving_members WHERE tenant_id=$1 AND revision_id=$3 AND (family<>'facts' OR NOT month=ANY($4::date[]))`, [scope.tenantId, scope.revisionId, scope.parent, unique.map((month) => `${month}-01`)]);
  for (const month of unique) await refreshMonth(client, scope, month);
  return unique;
}
async function refreshMonth(client, scope, month) {
  const { tenantId, revisionId } = scope;
  const prior = scope.parent ? (await client.query("SELECT partition_id FROM mart.analytics_serving_members WHERE tenant_id=$1 AND revision_id=$2 AND month=$3 AND family='facts'", [tenantId, scope.parent, `${month}-01`])).rows[0] : null;
  const priorExact = prior ? (await client.query("SELECT mart.drill_partition_exact($1,$2) exact", [tenantId, prior.partition_id])).rows[0].exact : false;
  const days = prior && priorExact && scope.days ? scope.days.filter((day) => day.startsWith(month)) : null;
  const partitionId = (0, import_node_crypto3.randomUUID)();
  await client.query("INSERT INTO mart.analytics_partitions(tenant_id,partition_id,month,capabilities) VALUES($1,$2,$3,$4)", [tenantId, partitionId, `${month}-01`, scope.partitionCapabilities?.[month] ? JSON.stringify(scope.partitionCapabilities[month]) : null]);
  if (days) await client.query(`INSERT INTO mart.analytics_aggregate_bases SELECT tenant_id,$2,measure_id,kind,business_date,dimensions,value,fact_count,labels FROM mart.analytics_aggregate_bases WHERE tenant_id=$1 AND partition_id=$3 AND NOT business_date=ANY($4::date[])`, [tenantId, partitionId, prior.partition_id, days]);
  await client.query(`INSERT INTO mart.analytics_aggregate_bases
 SELECT head.tenant_id,$2,payload->>'measureId',payload->>'kind',(payload->>'businessDate')::date,payload->'dimensions',sum((payload->>'value')::numeric),count(*),
 (array_agg(coalesce(payload->'displayLabels',payload->'transaction'->'labels','{}'::jsonb) ORDER BY payload->>'sourceAsOf' DESC,head.fact_key))[1]
 FROM mart.analytics_fact_heads head JOIN mart.analytics_fact_revisions revision USING(tenant_id,fact_key,revision_id)
 WHERE head.tenant_id=$1 AND head.status='active' AND head.business_month=left($3,7) AND ($4::date[] IS NULL OR (payload->>'businessDate')::date=ANY($4::date[]))
 GROUP BY head.tenant_id,payload->>'measureId',payload->>'kind',payload->>'businessDate',payload->'dimensions'`, [tenantId, partitionId, `${month}-01`, days]);
  if (days) await client.query(`INSERT INTO mart.analytics_partition_facts SELECT link.tenant_id,$2,link.fact_key,link.revision_id FROM mart.analytics_partition_facts link JOIN mart.analytics_fact_revisions revision USING(tenant_id,fact_key,revision_id) WHERE link.tenant_id=$1 AND link.partition_id=$3 AND NOT (payload->>'businessDate')::date=ANY($4::date[])`, [tenantId, partitionId, prior.partition_id, days]);
  await client.query(`INSERT INTO mart.analytics_partition_facts SELECT tenant_id,$2,fact_key,revision_id FROM mart.analytics_fact_heads WHERE tenant_id=$1 AND status='active' AND business_month=$3 AND ($4::date[] IS NULL OR (SELECT (payload->>'businessDate')::date FROM mart.analytics_fact_revisions revision WHERE revision.tenant_id=analytics_fact_heads.tenant_id AND revision.fact_key=analytics_fact_heads.fact_key AND revision.revision_id=analytics_fact_heads.revision_id)=ANY($4::date[]))`, [tenantId, partitionId, month, days]);
  await reconcileEventRollup(client, tenantId, partitionId);
  const exact = (await client.query("SELECT mart.drill_partition_exact($1,$2) exact", [tenantId, partitionId])).rows[0].exact;
  if (!exact) throw new Error("Canonical drill membership must reconcile to partition");
  await client.query("INSERT INTO mart.analytics_drill_partitions VALUES($1,$2)", [tenantId, partitionId]);
  await client.query("INSERT INTO mart.analytics_serving_members VALUES($1,$2,$3,$4)", [tenantId, revisionId, `${month}-01`, partitionId]);
}

// packages/data/src/operational/snapshot-promotion.ts
var import_node_crypto4 = require("node:crypto");
async function attachFinancePartition(client, scope) {
  const partitionId = (0, import_node_crypto4.randomUUID)(), month = scope.date.slice(0, 7) + "-01";
  await client.query("INSERT INTO mart.analytics_partitions(tenant_id,partition_id,month,family,snapshot_id) VALUES($1,$2,$3,'receivables',$4)", [scope.tenantId, partitionId, month, scope.snapshotId]);
  await client.query("INSERT INTO mart.analytics_serving_members(tenant_id,revision_id,month,partition_id,family) VALUES($1,$2,$3,$4,'receivables')", [scope.tenantId, scope.revisionId, month, partitionId]);
}

// packages/data/src/operational/adoption.ts
async function adoptLegacyServing(client) {
  const tenants = (await client.query("SELECT tenant_id FROM serving_adoption_tenants ORDER BY tenant_id")).rows;
  await client.query("ALTER TABLE mart.analytics_baselines DISABLE TRIGGER immutable_history");
  for (const row of tenants) {
    await client.query("SELECT set_config('mart.tenant_id',$1,true)", [row.tenant_id]);
    await adoptCertifiedServing(client, row.tenant_id, true);
    await client.query("SET CONSTRAINTS ALL IMMEDIATE");
    await client.query("SET CONSTRAINTS ALL DEFERRED");
  }
  await client.query("ALTER TABLE mart.analytics_baselines ENABLE TRIGGER immutable_history");
}
async function adoptCertifiedServing(client, tenantId, migration = false) {
  await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [`analytics:${tenantId}`]);
  const prior = (await client.query("SELECT revision_id FROM mart.analytics_trusted_serving WHERE tenant_id=$1", [tenantId])).rows[0]?.revision_id;
  if (prior && !migration) return { alreadyBootstrapped: true };
  const datasets = (await client.query(`SELECT dataset_id FROM mart.mapping_releases WHERE tenant_id=$1 AND approval_status='approved'
 AND ($2::boolean=false OR dataset_id IN(SELECT unnest(datasets) FROM mart.analytics_baselines WHERE tenant_id=$1
 UNION SELECT member.dataset_id FROM mart.historical_release_members member JOIN mart.historical_serving_bindings binding USING(tenant_id,reference) WHERE member.tenant_id=$1
 UNION SELECT dataset_id FROM mart.serving_bindings WHERE tenant_id=$1)) ORDER BY dataset_id`, [tenantId, migration])).rows.map((row) => String(row.dataset_id));
  const baseline = await certifiedBaseline(client, tenantId, datasets);
  const existing = (await client.query("SELECT * FROM mart.analytics_baselines WHERE tenant_id=$1", [tenantId])).rows[0];
  if (existing) {
    if (existing.definition_version !== baseline.definitionVersion || existing.mapping_version !== baseline.mappingVersion) throw new Error("Explicit semantic migration required");
    const priorBaseline = await readBaseline(client, tenantId);
    const previousRecipes = new Set(priorBaseline.mappings.map((mapping) => JSON.stringify(mapping.measures)));
    baseline.mappings = [...priorBaseline.mappings, ...baseline.mappings.filter((mapping) => !previousRecipes.has(JSON.stringify(mapping.measures)))];
    if (datasets.every((dataset) => existing.datasets.includes(dataset))) baseline.capabilities = existing.capabilities;
  }
  const values = [tenantId, baseline.sourceId, baseline.reportingCurrency, datasets, baseline.definitionVersion, baseline.mappingVersion, JSON.stringify(baseline.mappings), JSON.stringify(baseline.capabilities), baseline.from, baseline.to];
  await client.query(`INSERT INTO mart.analytics_baselines VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
 ON CONFLICT(tenant_id) DO UPDATE SET datasets=EXCLUDED.datasets,specification=EXCLUDED.specification,capabilities=EXCLUDED.capabilities,period_from=least(analytics_baselines.period_from,EXCLUDED.period_from),period_to=greatest(analytics_baselines.period_to,EXCLUDED.period_to)`, values);
  const mappings = (await client.query("SELECT * FROM mart.mapping_releases WHERE tenant_id=$1 AND dataset_id=ANY($2::text[])", [tenantId, datasets])).rows.map(certifiedMapping);
  if (prior) {
    const priorParts = (await client.query("SELECT to_char(member.month,'YYYY-MM') AS month,part.capabilities FROM mart.analytics_serving_members member JOIN mart.analytics_partitions part USING(tenant_id,partition_id) WHERE member.tenant_id=$1 AND member.revision_id=$2 AND member.family='facts'", [tenantId, prior])).rows;
    for (const part of priorParts) if (!baseline.partitionCapabilities[part.month]) baseline.partitionCapabilities[part.month] = part.capabilities;
  }
  await assertAdoptionHeadParity(client, tenantId);
  const canonicalFacts = await copyBaselineFacts(client, baseline, mappings);
  const cutoff = (await client.query("SELECT max(source_as_of) cutoff FROM mart.ingestion_batches WHERE tenant_id=$1 AND dataset_id=ANY($2::text[]) AND status='committed'", [tenantId, datasets])).rows[0].cutoff?.toISOString();
  if (!cutoff) throw new Error("Immutable source cutoff required");
  const snapshots = migration ? (await client.query("SELECT snapshot_id,snapshot_date::text FROM mart.finance_snapshot_publications WHERE tenant_id=$1 ORDER BY snapshot_date", [tenantId])).rows : [];
  const months = Object.keys(baseline.partitionCapabilities).sort();
  const revisionId = (0, import_node_crypto5.randomUUID)();
  await refreshOperationalMonths(client, { tenantId, revisionId, parent: prior ?? null, runId: null, cutoff, purpose: "adoption", additionalAffectedMonths: snapshots.map((snapshot2) => snapshot2.snapshot_date.slice(0, 7)), partitionCapabilities: baseline.partitionCapabilities }, months);
  for (const snapshot2 of snapshots) await attachFinancePartition(client, { tenantId, revisionId, snapshotId: snapshot2.snapshot_id, date: snapshot2.snapshot_date });
  await client.query("INSERT INTO mart.analytics_trusted_serving VALUES($1,$2) ON CONFLICT(tenant_id) DO UPDATE SET revision_id=EXCLUDED.revision_id", [tenantId, revisionId]);
  return { alreadyBootstrapped: false, revisionId, cutoff, canonicalFacts, months };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  adoptCertifiedServing,
  adoptLegacyServing
});
