# 异步 Action

异步 Action 需要用到中间件，需要 redux 提供的 applyMiddleware 来处理中间件，首先我们先看看 applyMiddleware 的实现。

## compose 函数的实现
因为 applyMiddleware 中要用到 compose，所以先简单的介绍一下该函数的用法，该函数实现从右到左来组合多个函数。
调用 `compose(f, g, h)` 相当于 `arg => f(g(h(arg)))`。compose 的实现是一个高阶函数

compose 函数源代码实现

```javascript
/**
 * Composes single-argument functions from right to left.
 *
 * @param {...Function} funcs The functions to compose.
 * @returns {Function} A function obtained by composing functions from right to
 * left. For example, compose(f, g, h) is identical to arg => f(g(h(arg))).
 */
export default function compose(...funcs) {
  return (...args) => {
    if (funcs.length === 0) {
      return args[0]
    }

    const last = funcs[funcs.length - 1]
    const rest = funcs.slice(0, -1)

    return rest.reduceRight((composed, f) => f(composed), last(...args))
  }
}
```

翻译成 es5 的写法为

```javascript
function compose() {
  var funcs = [];
  for (var i = 0, len = arguments.length; i < len; i++) {
    funcs[i] = arguments[i];
  }
  return function () {
    if (funcs.length === 0) {
      return funcs[0];
    }
    var last = funcs[funcs.length - 1];
    var rest = funcs.slice(0, -1);//删除最后一个

    return rest.reduceRight(function (composed, f) {
      return f(composed);
    }, last.apply(undefined, arguments));
  };
}
```

例子
```javascript
var composedFn = compose(function (val) {
  return Math.pow(val, 3);
}, function (val) {
  return val * val;
}, function (val) {
  return Math.abs(val);
});

console.info(composedFn(-2));//结果为64
```

## applyMiddleware 函数的实现
官方介绍的比较详细，参看这里 http://cn.redux.js.org/docs/api/applyMiddleware.html
源代码的实现为

```javascript
/**
 * 第一次调用，传入 createStore，处理中间件后，重新返回与 createStore函数一样功能的函数
 * const createStoreWithMiddleware = applyMiddleware(
   thunk, // 用来处理异步中间件
   createLogger() // 中间件，用来打印日志
   )(createStore);
 再一次调用 createStoreWithMiddleware(reducer, initialState); 会依次处理中间件函数，
 每个中间件函数接收 store 中的 getState 和 dispatch，然后重新返回 getState 和 dispatch，
 过程用到了 compose 函数，最终是调用了第三方组件重新返回新的 store，这与 createSore 实现的功能是一样的
 * @param middlewares
 * @returns {Function}
 */
export default function applyMiddleware(...middlewares) {
  return (createStore) => (reducer, initialState, enhancer) => {
    var store = createStore(reducer, initialState, enhancer)
    var dispatch = store.dispatch
    var chain = []

    var middlewareAPI = {
      getState: store.getState,
      dispatch: (action) => dispatch(action)
    }
    chain = middlewares.map(middleware => middleware(middlewareAPI))
    dispatch = compose(...chain)(store.dispatch)

    return {
      ...store,
      dispatch
    }
  }
}
```

## 用来处理异步的中间件，这里我们选用 `redux-thunk`
该中间件实现起来非常简单

```javascript
function thunkMiddleware({ dispatch, getState }) {
  return next => action =>
    typeof action === 'function' ?
      action(dispatch, getState) :
      next(action);
}

module.exports = thunkMiddleware
```
