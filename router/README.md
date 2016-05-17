# React Router 学习

# 知识点

* 在组件中使用 router
  ```javascript
  class Detail extends Component {

    constructor(props, context) {
      super(props, context);
      console.info(this.context.router);
    }
  }
  toOtherRouter() {
    this.context.router.push('./path');
  }
  Detail.contextTypes = {
    router: PropTypes.object.isRequired
  }
  ```

# 参考资料

* [react-router 2.x 升级指南](https://github.com/reactjs/react-router/blob/v2.0.0/upgrade-guides/v2.0.0.md?utm_source=tuicool&utm_medium=referral)
