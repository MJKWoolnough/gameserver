package gameserver

import (
	"net/http"

	"golang.org/x/net/websocket"
)

func New() *http.ServeMux {
	m := http.NewServeMux()
	m.Handle("/socket", websocket.Handler(newSocket().ServeConn))
	return m
}
