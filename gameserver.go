package gameserver

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"sync"

	"golang.org/x/net/websocket"
	"vimagination.zapto.org/jsonrpc"
)

// New create a new gameserver mux
func New() *http.ServeMux {
	m := http.NewServeMux()
	m.Handle("/socket", websocket.Handler(newServer().ServeConn))
	return m
}

type conns map[*conn]struct{}

type server struct {
	mu    sync.RWMutex
	rooms map[string]*room
	conns conns
}

func newServer() *server {
	return &server{
		rooms: map[string]*room{
			"default": newRoom("default", nil),
		},
		conns: make(conns),
	}
}

func (s *server) ServeConn(wconn *websocket.Conn) {
	c := &conn{
		server: s,
	}
	s.mu.Lock()
	s.conns[c] = struct{}{}
	s.mu.Unlock()
	c.rpc = jsonrpc.New(wconn, c)
	c.rpc.Handle()
	s.mu.Lock()
	delete(s.conns, c)
	s.mu.Unlock()
}

type role uint8

const (
	roleNone role = iota
	roleAdmin
	roleUser
	roleSpectator
)

type conn struct {
	rpc    *jsonrpc.Server
	server *server

	mu   sync.RWMutex
	name string
	room *room
	role role
}

type room struct {
	Name string

	mu         sync.RWMutex
	admin      *conn
	users      conns
	spectators conns
	names      map[string]struct{}
}

func (r *room) join(conn *conn) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, ok := r.names[conn.name]; ok {
		return errNameExists
	}
	r.names[conn.name] = struct{}{}
	r.users[r.admin] = struct{}{}
	broadcast(r.users, broadcastUserJoin, strconv.AppendQuote(json.RawMessage{}, conn.name))
	delete(r.users, r.admin)
	r.users[conn] = struct{}{}
	return nil
}

func (r *room) leave(conn *conn) {
	r.mu.Lock()
	defer r.mu.Unlock()
	delete(r.names, conn.name)
	if r.admin == conn {
		r.admin = nil
		broadcast(r.users, broadcastAdminNone, json.RawMessage{'0'})
	} else if _, ok := r.users[conn]; ok {
		delete(r.users, conn)
		broadcast(r.users, broadcastUserLeave, strconv.AppendQuote(json.RawMessage{}, conn.name))
	} else {
		delete(r.spectators, conn)
	}
}

func newRoom(name string, admin *conn) *room {
	return &room{
		Name:       name,
		admin:      admin,
		users:      make(conns),
		spectators: make(conns),
		names:      map[string]struct{}{admin.name: {}},
	}
}

type roomUser struct {
	Room string `json:"room"`
	User string `json:"user"`
}

func (c *conn) HandleRPC(method string, data json.RawMessage) (interface{}, error) {
	switch method {
	case "listRooms":
		rooms := json.RawMessage{'['}
		c.server.mu.RLock()
		defer c.server.mu.RUnlock()
		first := true
		for room := range c.server.rooms {
			if first {
				first = false
			} else {
				rooms = append(rooms, ',')
			}
			strconv.AppendQuote(rooms, room)
		}
		return append(rooms, ']'), nil
	case "addRoom":
		var names roomUser
		if err := json.Unmarshal(data, &names); err != nil {
			return nil, err
		}
		c.mu.Lock()
		defer c.mu.Unlock()
		c.server.mu.Lock()
		defer c.server.mu.Unlock()
		if _, ok := c.server.rooms[names.Room]; ok {
			return nil, errRoomExists
		}
		c.name = names.User
		c.room = newRoom(names.Room, c)
		c.server.rooms[names.Room] = c.room
		broadcast(c.server.conns, broadcastRoomAdd, data)
		return nil, nil
	case "joinRoom":
		var names roomUser
		if err := json.Unmarshal(data, &names); err != nil {
			return nil, err
		}
		c.server.mu.RLock()
		defer c.server.mu.RUnlock()
		c.mu.Lock()
		defer c.mu.Unlock()
		if c.room != nil {
			c.room.leave(c)
		}
		c.room = nil
		c.name = names.User
		room, ok := c.server.rooms[names.Room]
		if !ok {
			return nil, errUnknownRoom
		}
		if err := room.join(c); err != nil {
			return nil, err
		}
		c.room = room
		return nil, nil
	case "leaveRoom":
		c.mu.Lock()
		defer c.mu.Unlock()
		if c.room != nil {
			c.room.leave(c)
			c.room = nil
			c.name = ""
		}
		return nil, nil
	case "adminRoom":
	case "spectateRoom":
	case "toAdmin":
	case "toUsers":
	case "toSpectators":
	}
	return nil, errUnkownEndpoint
}

const (
	broadcastRoomAdd uint8 = iota
	broadcastRoomRemove
	broadcastAdminNone
	broadcastAdmin
	broadcastUserJoin
	broadcastUserLeave
	broadcastToUsers
	broadcastToSpectators
)

const broadcastStart = "{\"id\": -0,\"result\":"

func buildBroadcast(id uint8, data json.RawMessage) json.RawMessage {
	l := len(broadcastStart) + len(data) + 1
	dat := make(json.RawMessage, l)
	copy(dat, broadcastStart)
	copy(dat[len(broadcastStart):], data)
	id = -id
	if id > 9 {
		dat[6] = '-'
		dat[7] = byte('0' + id/10)
	}
	dat[8] = byte('0' + id%10)
	dat[l-1] = '}'
	return dat
}

func broadcast(conns conns, broadcastID uint8, message json.RawMessage) {
	if len(conns) == 0 {
		return
	}
	dat := buildBroadcast(broadcastID, message)
	for conn := range conns {
		if conn != nil {
			go conn.rpc.SendData(dat)
		}
	}
}

var (
	errUnkownEndpoint = errors.New("unknown endpoint")
	errRoomExists     = errors.New("room exists")
	errNameExists     = errors.New("name exists")
	errUnknownRoom    = errors.New("unknown room")
)
