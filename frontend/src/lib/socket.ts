import { io } from 'socket.io-client';

const socket = io({
  path: '/api/socket.io',
  autoConnect: false,
  withCredentials: true,
});

export default socket;
