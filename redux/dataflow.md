# Redux 数据流
上面介绍了 Action Reducers Store Connect 以及 Provider，那么与 React Component 交互时又是怎么处理的？怎样通过调用 action 以及 reducers 来更新 state 的，下面通过数据流，我们分析一下。

## 数据流入口
通过 Provider 把 store （基于 react context）传入用户定义的组件中

```javascript
import React from 'react';
import {render} from 'react-dom';
import {Provider} from 'react-redux';
import App from './containers/App';
import configureStore from './store/configureStore';

const store = configureStore();
render((
  <Provider store={store}>
    <App />
  </Provider>
), document.getElementById('layout'));
```

## 设置 store
利用 createStore 创建封装 store，返回的 store 结果为

```javascript
{
   dispatch, // dispatch(action)，dispatch 函数，内部调用当前 reducer，结合 action 返回最新的 state
   subscribe, // subscribe(listener) 订阅-取消订阅函数
   getState, // 返回 state
   replaceReducer // replaceReducer(nextReducer)，替换 reducer，并执行 dispatch
}
```

实现代码

```javascript
import {createStore} from 'redux';
import reducer from '../reducers';

export default function configureStore(initialState) {
  const store = createStore(reducer, initialState);
  return store;
}
```
对于异步操作，创建 store 时，需要用到中间件，异步操作中会介绍

## 关联 actions reducers 以及 dispatch
是通过 react-redux 中的 connect 来关联的，把 actionProps 和 stateProps 传到自定义组件中（下面的例子为 PersonList）

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
 * @param dispatch
 * @returns {{actions: *}}
 */
function mapDispatchToProps(dispatch) {
  //return bindActionCreators(Actions, dispatch);
  return {
    actions: bindActionCreators(Actions, dispatch)
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(PersonList);
```

## Redux 应用中数据的生命周期中的 4 个步骤

经过上面的代码实现，把相关数据流给链接到一起了，下面看其数据生命周期

1. 调用 store.dispatch(action)。
    Action 就是一个描述“发生了什么”的普通对象。比如：
     ```javascript
     { type: 'LIKE_ARTICLE', articleId: 42 };
     { type: 'FETCH_USER_SUCCESS', response: { id: 3, name: 'Mary' } };
     { type: 'ADD_TODO', text: 'Read the Redux docs.'};
     ```
    可以把 action 理解成新闻的摘要。如 “玛丽喜欢42号文章。” 或者 “任务列表里添加了'学习 Redux 文档'”。

    你可以在任何地方调用 store.dispatch(action)，包括组件中、XHR 回调中、甚至定时器中。

2. Redux store 调用传入的 reducer 函数。

    Store 会把两个参数传入 reducer： 当前的 state 树和 action。例如，在这个 curd 应用中，根 reducer 可能接收这样的数据：

   ```javascript
   // 当前应用的 state
   let previousState = {
     type: 'LIST_PERSON',
     persons: [
       {
          id: 0,
          firstName: '张',
          lastName: '三',
          completed: false
       }
     ]
   }

   // 将要执行的 action（添加一个 person）
   let action = {
     type: 'ADD_PERSON',
     person
   }

   // render 返回处理后的应用状态
   let nextState = App(previousState, action);
   ```
  注意 reducer 是纯函数。它仅仅用于计算下一个 state。它应该是完全可预测的：多次传入相同的输入必须产生相同的输出。它不应做有副作用的操作，如 API 调用或路由跳转。这些应该在 dispatch action 前发生。

3. 根 reducer 应该把多个子 reducer 输出合并成一个单一的 state 树。

    根 reducer 的结构完全由你决定。Redux 原生提供combineReducers()辅助函数，来把根 reducer 拆分成多个函数，用于分别处理 state 树的一个分支。

    虽然 combineReducers() 是一个很方便的辅助工具，你也可以选择不用；你可以自行实现自己的根 reducer！

4. Redux store 保存了根 reducer 返回的完整 state 树。

    这个新的树就是应用的下一个 state！所有订阅 store.subscribe(listener) 的监听器都将被调用；监听器里可以调用 store.getState() 获得当前 state。

    现在，可以应用新的 state 来更新 UI。如果你使用了 React Redux 这类的绑定库，这时就应该调用 component.setState(newState) 来更新。
