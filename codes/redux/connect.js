const { Component, createElement } = require('react')
// store 数据类型，包括 subscribe dispatch 和 getState
const storeShape = require('../utils/storeShape')
// 比较两个对象是否相等，只要 OwnProperty 个数相等，并且属性值也相等，则认为这两个对象相等
const shallowEqual = require('../utils/shallowEqual')
// 是否为扁平对象
const isPlainObject = require('../utils/isPlainObject')
// 用 bindActionCreators(actionCreators, dispatch) 处理 action 和 dispatch
const wrapActionCreators = require('../utils/wrapActionCreators')
// 把 React 中 孩子组件静态属性复制到父组件静态属性中（不包括 react 特有的属性，比如 displayName 等）
const hoistStatics = require('hoist-non-react-statics')
// 用来格式化错误信息
const invariant = require('invariant')
// 默认 state 与 prop 关联函数
const defaultMapStateToProps = state => ({}) // eslint-disable-line no-unused-vars
// 默认 dispatch 与 props 关联函数，默认返回 {dispatch: dispatch}
const defaultMapDispatchToProps = dispatch => ({ dispatch })
// 默认合并 props 函数，会把 stateProps、dispatchProps 和 parentProps 合并
const defaultMergeProps = (stateProps, dispatchProps, parentProps) => ({
  ...parentProps,
  ...stateProps,
  ...dispatchProps
})

// 返回组件 displayName
function getDisplayName(WrappedComponent) {
  return WrappedComponent.displayName || WrappedComponent.name || 'Component'
}

// Helps track hot reloading.
// 热加载
let nextVersion = 0

/**
 * 把 state 中的值与 props 关联，这里名字名称可以不一致，但为了好维护，建议写成一样
 //子组件就可以调用 this.props.counter 来显示其值了
 function mapStateToProps(state) {
  return {
    counter: state.counter
  };
}
 * @param mapStateToProps 把 state 中的值与 props 关联，这里 props 属性名可以跟 state 属性名不一致，但为了好维护，建议写成一样
 * 看以下例子，state 中属性初始值为 reducer 中传的初始值，属性名为 combineReducers({...}) 中定义的属性名
 * function mapStateToProps(state) {
    return {
      persons: state.persons,
      filter: state.filter
    };
  }
 * 内部处理后，子组件就可以调用 this.props.person 或 this.props.filter 了
 *
 * @param mapDispatchToProps
 * 把 dispatch 和 action 绑定，然后通过 connect 把组件 Counter 跟 action 连接起来，这样
 * 组件就可以使用 action 中定义的行为了，最终是通过 props 来处理的
 * function mapDispatchToProps(dispatch) {
    //return bindActionCreators(Actions, dispatch);
    return {
      actions: bindActionCreators(Actions, dispatch)
    };
  }
 mapDispatchToProps 的值也可以是对象，即
 {
  actions: bindActionCreators(Actions, dispatch)
 }
 此时会调用 wrapActionCreators 来转换
 * @param mergeProps
 * @param options
 * @returns {wrapWithConnect}
 */
function connect(mapStateToProps, mapDispatchToProps, mergeProps, options = {}) {
  const shouldSubscribe = Boolean(mapStateToProps)
  const finalMapStateToProps = mapStateToProps || defaultMapStateToProps
  // 如果 mapDispatchToProps 为对象，则调用 wrapActionCreators 来生成 ActionCreator 函数
  const finalMapDispatchToProps = isPlainObject(mapDispatchToProps) ?
    wrapActionCreators(mapDispatchToProps) :
    mapDispatchToProps || defaultMapDispatchToProps
  const finalMergeProps = mergeProps || defaultMergeProps
  //传入的 mapStateToProps 函数参数值不等于1
  const doStatePropsDependOnOwnProps = finalMapStateToProps.length !== 1
  const doDispatchPropsDependOnOwnProps = finalMapDispatchToProps.length !== 1
  // options 选项
  const { pure = true, withRef = false } = options

  // Helps track hot reloading.
  const version = nextVersion++

  /**
   * 得到此时的 props
   * @param store
   * @param props
   * @returns {*}
   */
  function computeStateProps(store, props) {
    const state = store.getState()
    const stateProps = doStatePropsDependOnOwnProps ?
      finalMapStateToProps(state, props) :
      finalMapStateToProps(state)

    invariant(
      isPlainObject(stateProps),
      '`mapStateToProps` must return an object. Instead received %s.',
      stateProps
    )
    return stateProps
  }

  /**
   * 返回此时的 action props
   * @param store
   * @param props
   * @returns {*}
   */
  function computeDispatchProps(store, props) {
    const { dispatch } = store
    const dispatchProps = doDispatchPropsDependOnOwnProps ?
      finalMapDispatchToProps(dispatch, props) :
      finalMapDispatchToProps(dispatch)

    invariant(
      isPlainObject(dispatchProps),
      '`mapDispatchToProps` must return an object. Instead received %s.',
      dispatchProps
    )
    return dispatchProps
  }

  /**
   *
   * @param stateProps
   * @param dispatchProps
   * @param parentProps
   * @returns {*}
   */
  function computeMergedProps(stateProps, dispatchProps, parentProps) {
    const mergedProps = finalMergeProps(stateProps, dispatchProps, parentProps)
    invariant(
      isPlainObject(mergedProps),
      '`mergeProps` must return an object. Instead received %s.',
      mergedProps
    )
    return mergedProps
  }

  /**
   * 当调用 connect(mapStateToProps, mapDispatchToProps) 执行以下返回函数，然后再执行
   * connect(mapStateToProps, mapDispatchToProps)(PersonList) 返回内层 Connect 组件
   * Connect 组件会设置
   <pre>
     Connect.WrappedComponent = WrappedComponent
     Connect.contextTypes = {
      store: storeShape
     }
     Connect.propTypes = {
      store: storeShape
    }
   </pre>
   * 同时把被包裹组件 WrappedComponent 静态非 react 特有属性赋给 Connect
   *
   */
  return function wrapWithConnect(WrappedComponent) {
    class Connect extends Component {
      shouldComponentUpdate() {
        return !pure || this.haveOwnPropsChanged || this.hasStoreStateChanged
      }

      constructor(props, context) {
        super(props, context)
        this.version = version
        this.store = props.store || context.store

        invariant(this.store,
          `Could not find "store" in either the context or ` +
          `props of "${this.constructor.displayName}". ` +
          `Either wrap the root component in a <Provider>, ` +
          `or explicitly pass "store" as a prop to "${this.constructor.displayName}".`
        )

        // 从 store 返回当前的 state
        const storeState = this.store.getState()
        this.state = { storeState }
        this.clearCache()
      }

      updateStatePropsIfNeeded() {
        const nextStateProps = computeStateProps(this.store, this.props)
        if (this.stateProps && shallowEqual(nextStateProps, this.stateProps)) {
          return false
        }

        this.stateProps = nextStateProps
        return true
      }

      updateDispatchPropsIfNeeded() {
        const nextDispatchProps = computeDispatchProps(this.store, this.props)
        if (this.dispatchProps && shallowEqual(nextDispatchProps, this.dispatchProps)) {
          return false
        }

        this.dispatchProps = nextDispatchProps
        return true
      }

      updateMergedProps() {
        this.mergedProps = computeMergedProps(
          this.stateProps,
          this.dispatchProps,
          this.props
        )
      }

      isSubscribed() {
        return typeof this.unsubscribe === 'function'
      }

      trySubscribe() {
        if (shouldSubscribe && !this.unsubscribe) {
          this.unsubscribe = this.store.subscribe(::this.handleChange)
          this.handleChange()
        }
      }

      tryUnsubscribe() {
        if (this.unsubscribe) {
          this.unsubscribe()
          this.unsubscribe = null
        }
      }

      componentDidMount() {
        this.trySubscribe()
      }

      componentWillReceiveProps(nextProps) {
        if (!pure || !shallowEqual(nextProps, this.props)) {
          this.haveOwnPropsChanged = true
        }
      }

      componentWillUnmount() {
        this.tryUnsubscribe()
        this.clearCache()
      }

      clearCache() {
        this.dispatchProps = null
        this.stateProps = null
        this.mergedProps = null
        this.haveOwnPropsChanged = true
        this.hasStoreStateChanged = true
        this.renderedElement = null
      }

      // 如果 store 中 state 改变，则更新 state
      handleChange() {
        if (!this.unsubscribe) {
          return
        }

        const prevStoreState = this.state.storeState
        const storeState = this.store.getState()

        if (!pure || prevStoreState !== storeState) {
          this.hasStoreStateChanged = true
          this.setState({ storeState })
        }
      }

      getWrappedInstance() {
        invariant(withRef,
          `To access the wrapped instance, you need to specify ` +
          `{ withRef: true } as the fourth argument of the connect() call.`
        )

        return this.refs.wrappedInstance
      }

      render() {
        /**
         *
         * 渲染中根据一些状态判断是否需要调用
         * updateStatePropsIfNeeded 等
         */
        const {
          haveOwnPropsChanged,
          hasStoreStateChanged,
          renderedElement
        } = this

        this.haveOwnPropsChanged = false
        this.hasStoreStateChanged = false

        let shouldUpdateStateProps = true
        let shouldUpdateDispatchProps = true
        if (pure && renderedElement) {
          shouldUpdateStateProps = hasStoreStateChanged || (
            haveOwnPropsChanged && doStatePropsDependOnOwnProps
          )
          shouldUpdateDispatchProps =
            haveOwnPropsChanged && doDispatchPropsDependOnOwnProps
        }

        let haveStatePropsChanged = false
        let haveDispatchPropsChanged = false
        if (shouldUpdateStateProps) {
          haveStatePropsChanged = this.updateStatePropsIfNeeded()
        }
        if (shouldUpdateDispatchProps) {
          haveDispatchPropsChanged = this.updateDispatchPropsIfNeeded()
        }

        let haveMergedPropsChanged = true
        if (
          haveStatePropsChanged ||
          haveDispatchPropsChanged ||
          haveOwnPropsChanged
        ) {
          this.updateMergedProps()
        } else {
          haveMergedPropsChanged = false
        }

        if (!haveMergedPropsChanged && renderedElement) {
          return renderedElement
        }

        // 创建新的 renderedElement ，这样传入的 WrappedComponent，即拥有了所有生成的 props
        if (withRef) {
          this.renderedElement = createElement(WrappedComponent, {
            ...this.mergedProps,
            ref: 'wrappedInstance'
          })
        } else {
          this.renderedElement = createElement(WrappedComponent,
            this.mergedProps
          )
        }

        return this.renderedElement
      }
    }

    Connect.displayName = `Connect(${getDisplayName(WrappedComponent)})`
    Connect.WrappedComponent = WrappedComponent
    Connect.contextTypes = {
      store: storeShape
    }
    Connect.propTypes = {
      store: storeShape
    }

    if (process.env.NODE_ENV !== 'production') {
      Connect.prototype.componentWillUpdate = function componentWillUpdate() {
        if (this.version === version) {
          return
        }

        // We are hot reloading!
        this.version = version
        this.trySubscribe()
        this.clearCache()
      }
    }

    return hoistStatics(Connect, WrappedComponent)
  }
}

module.exports = connect
