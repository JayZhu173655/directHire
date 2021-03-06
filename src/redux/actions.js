/*
*   包含所有action creator（即要发送给reducer的action）
*   异步action和同步action
*/
import {
    AUTH_SUCCESS,
    ERROR_MSG,
    RECEIVE_USER,
    RESET_USER,
    RECEIVE_USER_LIST,
    RECEIVE_MSG_LIST,
    RECEIVE_MSG,
    MSG_READ
} from './action-type';
import {
    reqRegister,
    reqLogin,
    reqUpdateUser,
    reqUser,
    reqUserList,
    reqChatMsgList,
    reqReadMsg
} from '../api';
// 用于对话的库
import io from 'socket.io-client';


/*
*   单例对象
*   1、创建对象之前：判断对象是否已经存在，只有不存在才去创建
*   2、创建对象之后，保存对象
*
*/
function initIO(dispatch, userid){
    //创建对象之前：判断对象是否已经存在，只有不存在才去创建
    if(!io.socket){
        // 连 接 服 务 器 ,  得 到 代 表 连 接 的 socket 对 象
        io.socket = io('ws://localhost:3001');
        // 绑 定 'receiveMessage' 的 监 听 , 来 接 收 服 务 器 发 送 的 消 息
        io.socket.on('receiveMsg', function (chatMsg) {
            //只有当chatMsg是否与当前用户相关，相关才会去发布同步action
            if(userid === chatMsg.from || userid === chatMsg.to){
                dispatch(receiveMsg(chatMsg, userid));
            }
        });
    }
}

// 获取消息列表
async function getMsgList(dispatch, userid){
    // 初始化IO
    initIO(dispatch, userid);
    const response = await reqChatMsgList();
    const result = response.data;
    if(result.code === 0){
        const {users, chatMsgs} = result.data;
        dispatch(receiveMsgList({users, chatMsgs, userid}));
    }
}

//授权成功的同步action
const authSuccess = (user) => ({type: AUTH_SUCCESS, data: user});
//错误提示信息的同步action
const errorMsg = (msg) => ({type: ERROR_MSG, data: msg});
//接收用户信息的同步action
const receiveUser = (user) => ({type: RECEIVE_USER, data: user});
//重置用户信息的同步action
export const resetUser = (msg) => ({type: RESET_USER, data: msg});
//接收用户列表的同步action
const receiveUserList = (userList) => ({type: RECEIVE_USER_LIST, data: userList});
//接收用户相关的信息列表的同步action
const receiveMsgList = ({users, chatMsgs, userid}) => ({type: RECEIVE_MSG_LIST, data: {users, chatMsgs, userid}});
//接收一条消息的同步action
const receiveMsg = (chatMsg, userid) => ({type: RECEIVE_MSG, data: {chatMsg, userid}});
//读取了某个未读消息同步action
const msgRead = ({count, from, to}) => ({type: MSG_READ, data: {count, from, to}});



// 当登录和注册切换时改变errorMsg的值
export const changeErrorMsg = (msg) => {
    return errorMsg(msg);
};


//注册异步action
export const register = (user) => {
    /*
    return dispatch => {
        // 发送注册的异步ajax请求

        reqRegister(user)
            .then(response => {
                const result = response.data;
            })
            .catch(err => {
                console.log(err);
             })

        // 如果你不需要promise对象，可以使用await,不过await只能在异步函数内使用
        // 可以写成下面形式
    }
    */
    const {username, password, password2, type} = user;

    //表单的前台验证，如果不通过，返回一个errorMsg的同步action
    if(!username){
        return errorMsg('用户名不能为空！')
    } else if(!password || (password !== password2)){
        return errorMsg('密码不能为空或2次密码不匹配！')
    }

    // 表单数据合法，返回一个发送ajax的异步请求的action函数
    return async dispatch => {
        // 发送注册的异步ajax请求
        const response = await reqRegister({username, password, type});
        const result = response.data;
        if(result.code === 0){
            getMsgList(dispatch, result.data._id);
            // 注册成功 分发成功的action
            dispatch(authSuccess(result.data))
        } else{
            // 注册失败 分发错误的信息的action
            dispatch(errorMsg(result.msg))
        }
    }
};

//登录异步action
export const login = (user) => {

    const {username, password} = user;

    //表单的前台验证，如果不通过，返回一个errorMsg的同步action
    if(!username){
        return errorMsg('用户名不能为空！')
    } else if(!password){
        return errorMsg('密码不能为空！')
    }

    return async(dispatch) => {
        // 发送登录的异步ajax请求
        const response = await reqLogin(user);
        const result = response.data;
        if(result.code === 0){
            getMsgList(dispatch, result.data._id);
            // 登录成功 分发成功的action
            dispatch(authSuccess(result.data))
        } else{
            // 登录失败 分发错误的信息的action
            dispatch(errorMsg(result.msg))
        }
    }
};

// 更新用户详细信息
export const updateUser = (user) => {
  return async dispatch => {
      const response = await reqUpdateUser(user);
      const result = response.data;
      if(result.code === 0){
          // 更新数据成功
          dispatch(receiveUser(result.data))
      } else{
          //更新数据失败
          dispatch(resetUser(result.msg))
      }
  }
};

// 获取用户异步action
export const getUser = () => {
  return async dispatch => {
      // 执行一步ajax请求
      const response = await reqUser();
      const result = response.data;
      if(result.code === 0){
          getMsgList(dispatch, result.data._id);
          // 获取用户信息成功了
          dispatch(receiveUser(result.data))
      } else{
          // 获取用户信息失败了
          dispatch(resetUser(result.msg))
      }
  }
};

// 获取用户列表的异步action
export const getUserList = (type) => {
    return async dispatch => {
        // 执行一步ajax请求
        const response = await reqUserList(type);
        const result = response.data;
        if(result.code === 0){
            // 获取用户列表成功了
            dispatch(receiveUserList(result.data))
        } else{
            // 获取用户列表失败了
            dispatch(resetUser(result.msg))
        }
    }
};

// 发送消息的异步action
export const sendMsg = ({from, to, content}) => {
    return dispatch => {
        // 发送消息
        io.socket.emit('sendMsg', {from, to, content})
    }
};

// 读取消息的异步action
export const readMsg = (from, to) => {
    console.log('ajax请求改变read值');
    return async dispatch => {
        const response = await reqReadMsg(from, to);
        const result = response.data;
        if(result.code === 0){
            const count = result.data;
            dispatch(msgRead({count, from, to}))
        }
    }
};
