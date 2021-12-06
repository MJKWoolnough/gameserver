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

func New() *http.ServeMux {
	m := http.NewServeMux()
	m.Handle("/socket", websocket.Handler(newServer().ServeConn))
	return m
}

type server struct {
	mu    sync.RWMutex
	rooms map[string]*room
	conns map[*conn]struct{}
}

func newServer() *server {
	return &server{
		rooms: map[string]*room{
			"default": newRoom("default"),
		},
		conns: make(map[*conn]struct{}),
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

	sync.RWMutex
	room *room
	role role
}

type room struct {
	Name string

	mu         sync.RWMutex
	admin      *conn
	users      map[*conn]struct{}
	spectators map[*conn]struct{}
}

func newRoom(name string) *room {
	return &room{
		Name:       name,
		users:      make(map[*conn]struct{}),
		spectators: make(map[*conn]struct{}),
	}
}

func (c *conn) HandleRPC(method string, data json.RawMessage) (interface{}, error) {
	switch method {
	case "listRooms":
		rooms := json.RawMessage{'['}
		c.server.mu.RLock()
		first := true
		for room := range c.server.rooms {
			if first {
				first = false
			} else {
				rooms = append(rooms, ',')
			}
			strconv.AppendQuote(rooms, room)
		}
		c.server.mu.RUnlock()
		return append(rooms, ']'), nil
	case "addRoom":
	case "joinRoom":
	case "leaveRoom":
	case "adminRoom":
	case "spectateRoom":
	case "toAdmin":
	case "toUsers":
	case "toSpectators":
	}
	return nil, errUnkownEndpoint
}

var errUnkownEndpoint = errors.New("unknown endpoint")

const (
	broadcastRoomAdd uint8 = iota
	broadcastRoomRemove
	broadcastAdminNone
	broadcastAdmin
	broadcastUser
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

func broadcast(conns map[*conn]struct{}, broadcastID uint8, message json.RawMessage) {
	if len(conns) == 0 {
		return
	}
	dat := buildBroadcast(broadcastID, message)
	for conn := range conns {
		go conn.rpc.SendData(dat)
	}
}
