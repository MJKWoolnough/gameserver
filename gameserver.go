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
func New(dataDir http.FileSystem) *http.ServeMux {
	m := http.NewServeMux()
	m.Handle("/data", http.FileServer(dataDir))
	m.Handle("/", index)
	m.Handle("/socket", websocket.Handler(newServer().ServeConn))
	return m
}

var noData = json.RawMessage{'{', '}'}

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
	if c.room != nil {
		if c.room.leave(c) {
			delete(s.rooms, c.room.Name)
		}
	}
	delete(s.conns, c)
	s.mu.Unlock()
}

type conn struct {
	rpc    *jsonrpc.Server
	server *server

	mu   sync.RWMutex
	name string
	room *room
}

type room struct {
	Name string

	mu     sync.RWMutex
	status json.RawMessage
	admin  *conn
	users  conns
	names  map[string]*conn
}

func newRoom(name string, admin *conn) *room {
	names := make(map[string]*conn)
	if admin != nil {
		names[admin.name] = admin
	}
	return &room{
		Name:   name,
		status: json.RawMessage{'{', '}'},
		admin:  admin,
		users:  make(conns),
		names:  names,
	}
}

func (r *room) join(conn *conn) (json.RawMessage, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, ok := r.names[conn.name]; ok {
		return nil, errNameExists
	}
	var (
		adminName string
		data      = json.RawMessage{'{', 'u', 's', 'e', 'r', 's', ':', '['}
		first     = true
	)
	for name, c := range r.names {
		if r.admin == c {
			adminName = name
			continue
		}
		if first {
			first = false
		} else {
			data = append(data, ',')
		}
		data = strconv.AppendQuote(data, name)
	}
	data = append(append(append(strconv.AppendQuote(append(data, "],\"admin\":"...), adminName), ",\"status\":"...), r.status...), '}')
	r.names[conn.name] = conn
	r.users[r.admin] = struct{}{}
	broadcast(r.users, broadcastUserJoin, strconv.AppendQuote(json.RawMessage{}, conn.name))
	delete(r.users, r.admin)
	r.users[conn] = struct{}{}
	return data, nil
}

func (r *room) spectate(conn *conn) json.RawMessage {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.users[conn] = struct{}{}
	return r.status
}

func (r *room) leave(conn *conn) bool {
	r.mu.Lock()
	defer r.mu.Unlock()
	delete(r.names, conn.name)
	delete(r.users, conn)
	if r.admin == conn {
		r.admin = nil
		r.status = noData
		broadcast(r.users, broadcastAdminNone, noData)
	} else if conn.name != "" {
		broadcast(r.users, broadcastUserLeave, strconv.AppendQuote(json.RawMessage{}, conn.name))
	}
	return len(r.names) == 0 && r.Name != "default"
}

func (r *room) promote(conn *conn) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if r.admin != nil {
		return errAdminExists
	}
	if _, ok := r.users[conn]; !ok || conn.name == "" {
		return errNotUser
	}
	delete(r.users, conn)
	r.admin = conn
	broadcast(r.users, broadcastAdmin, strconv.AppendQuote(json.RawMessage{}, conn.name))
	return nil
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
			rooms = strconv.AppendQuote(rooms, room)
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
		if c.room != nil {
			c.room.leave(c)
		}
		c.room = nil
		c.name = ""
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
		c.server.mu.Lock()
		defer c.server.mu.Unlock()
		c.mu.Lock()
		defer c.mu.Unlock()
		if c.room != nil {
			c.room.leave(c)
		}
		c.room = nil
		room, ok := c.server.rooms[names.Room]
		if !ok {
			return nil, errUnknownRoom
		}
		c.name = names.User
		roomJSON, err := room.join(c)
		if err != nil {
			return nil, err
		}
		c.room = room
		return roomJSON, nil
	case "leaveRoom":
		c.server.mu.Lock()
		defer c.server.mu.Unlock()
		c.mu.Lock()
		defer c.mu.Unlock()
		if c.room == nil {
			return nil, errNotInRoom
		}
		if c.room.leave(c) {
			delete(c.server.rooms, c.room.Name)
		}
		c.room = nil
		c.name = ""
		return nil, nil
	case "adminRoom":
		c.mu.Lock()
		defer c.mu.Unlock()
		if c.room == nil {
			return nil, errNotInRoom
		}
		if err := c.room.promote(c); err != nil {
			return nil, err
		}
		return nil, nil
	case "spectateRoom":
		var roomName string
		if err := json.Unmarshal(data, &roomName); err != nil {
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
		c.name = ""
		room, ok := c.server.rooms[roomName]
		if !ok {
			return nil, errUnknownRoom
		}
		c.room = room
		return room.spectate(c), nil
	case "setStatus":
		var roomStatus struct {
			Room   string          `json:"room"`
			Status json.RawMessage `json:"status"`
		}
		if err := json.Unmarshal(data, &roomStatus); err != nil {
			return nil, err
		}
		c.server.mu.RLock()
		defer c.server.mu.RUnlock()
		c.mu.Lock()
		defer c.mu.Unlock()
		if c.room == nil {
			return nil, errNotInRoom
		}
		c.room.mu.Lock()
		defer c.room.mu.Unlock()
		if c.room.admin != c {
			return nil, errNotAdmin
		}
		c.room.status = roomStatus.Status
		broadcast(c.room.users, broadcastMessage, roomStatus.Status)
		return nil, nil
	case "message":
		c.mu.RLock()
		defer c.mu.RUnlock()
		if c.room == nil {
			return nil, errNotInRoom
		}
		c.room.mu.RLock()
		defer c.room.mu.RUnlock()
		if c.room.admin == c {
			broadcast(c.room.users, broadcastMessage, data)
		} else if _, ok := c.room.names[c.name]; ok {
			go c.room.admin.rpc.SendData(buildBroadcast(broadcastMessage, append(append(append(strconv.AppendQuote(append(json.RawMessage{}, "{\"from\":"...), c.name), ",\"data\":"...), data...), '}')))
		} else {
			return nil, errNotUser
		}
		return nil, nil
	}
	return nil, errUnknownEndpoint
}

const (
	broadcastRoomAdd uint8 = iota
	broadcastRoomRemove
	broadcastAdminNone
	broadcastAdmin
	broadcastUserJoin
	broadcastUserLeave
	broadcastMessage
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
	errUnknownEndpoint = errors.New("unknown endpoint")
	errRoomExists      = errors.New("room exists")
	errNameExists      = errors.New("name exists")
	errUnknownRoom     = errors.New("unknown room")
	errAdminExists     = errors.New("admin exists")
	errNotUser         = errors.New("not user")
	errNotInRoom       = errors.New("not in room")
	errNotAdmin        = errors.New("not admin")
)
