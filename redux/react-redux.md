# react 与 redux 关联之 react-redux

## connect

connect 是由 react-redux 提供， connect 实现了把传入的 mapStateToProps 和 mapDispatchToProps进行预处理后，返回组件 Connect，
然后再调用该组件，并把用户定义的 react Component 传入。在 Connect 组件中把 stateProps 和 actionProps处理后合并后作为props传给用户定义的组件，这样用户定义的组件就可以直接调用使用 props 了，里面的数据处理完全交由 Connect。

一个从 connect() 包装好的组件可以得到一个 dispatch 方法作为组件的 props，以及得到全局 state 中所需的任何内容。 connect() 的唯一参数是 selector。此方法可以从 Redux store 接收到全局的 state，然后返回组件中需要的 props。最简单的情况下，可以返回一个初始的 state （例如，返回认证方法），但最好先将其进行转化。

例子

```javascript
import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import * as Actions from '../actions';

import PersonList from '../components/PersonList';

/**
 * 创建的 reducer 时，利用 combineReducers 传入的对象，在调用 createStore 生成 store 时
 * 会生成与 combineReducers 传入的对象属性名一样的 state 对象，所以这里可以使用
 * 这也说明了 state 中存在的属性必须在 combineReducers 传入的对象先定义
 * @param state
 * @returns {{persons: *, filter: *}}
 */
function mapStateToProps(state) {
  return {
    persons: state.persons,
    filter: state.filter
  };
}

/**
 * 在 connect 创建的组件 Connect 中调用 mapDispatchToProps时，
 * 通过调用 bindActionCreators，在 mapValues 中处理，把所有的 actions 即本例中的 Actions
 * 转换成一个新的对象，对象中包含了所有的 actions，本例中格式如下
 {
   editPerson: function () {
     return dispatch(actionCreator.apply(undefined, arguments))
   }
   ...
 }
 当调用 editPerson(person) 时，会返回
 dispatch(actionCreator.apply(undefined, arguments))
 actionCreator 即为在 actions/index.js 中定义的方法，如下
 export function editPerson(person) {
    return {
      type: ActionTypes.EDIT_PERSON,
      person
    };
  }
  所以最终会执行dispatch，并把新的 state 返回
 dispatch({
      type: ActionTypes.EDIT_PERSON,
      person
 })
 在 dispatch 中会调用对应的 reducer，本例子为 reducers/persons.js 中的
 export default function personsReducer(state = initState, action) {}
 bindActionCreators(Actions, dispatch) 会转换成 actions 组成的对象集
 * @param dispatch
 * @returns {{actions: *}}
 */
function mapDispatchToProps(dispatch) {
  //return bindActionCreators(Actions, dispatch);
  return {
    actions: bindActionCreators(Actions, dispatch),
    dispatch //把 dispatch 暴露给 props，对于异步操作，如果想在 props 中使用 dispatch，我们需要设置一下
  };
}

// 如果不传入 mapDispatchToProps ，会用默认的函数
// const defaultMapDispatchToProps = dispatch => ({ dispatch })
// 默认的函数直接返回了 dispatch
export default connect(mapStateToProps, mapDispatchToProps)(PersonList);

```


下面给出其源码实现

[import:1-15, connect.js](../codes/redux/connect.js)

在调用 connect 传入 mapDispatchToProps 我们用到了 bindActionCreators，该方法的功能是把 Actions 解析成可以直接调用 dispatch 的函数，比如 actions 中的方法 addPerson 会被解析为 `dispatch(addPerson(person))` 。这样就能调用 props 中的 action 方法，重新获取最新的 state 了，源码实现为

[import:1-15, bindActionCreators.js](../codes/redux/bindActionCreators.js)

## Provider

Provider 是由 react-redux 提供，继承了 react 组件（React.Component），内部实现比较简单，主要处理了 store。
我们知道，Connect 组件需要 store，所以组件 Provider 为其注入了 store，使得其子组件能够在上下文中使用 store 对象，
最新版本中，不允许动态的修改 store。

store 的数据传递，Provider 内部是通过 react context 来实现的，利用以下代码，把 store 传给子组件。context 的实现更像是全局变量，这样子组件就可以直接使用 store 了。

```javascript
class Provider extends Component {
  getChildContext() {
    return { store: this.store }
  }
}

Provider.childContextTypes = {
  store: storeShape.isRequired
}
```

关于更多 context 的信息可以参考[这里](https://facebook.github.io/react/docs/context.html)
