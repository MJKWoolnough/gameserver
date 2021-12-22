package main

import (
	"context"
	"flag"
	"fmt"
	"net/http"
	"os"
	"os/signal"

	"vimagination.zapto.org/gameserver"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func run() error {
	var dataDir string
	flag.StringVar(&dataDir, "d", "./data/", "Game Data Directory")
	flag.Parse()
	l, err := listen()
	if err != nil {
		return err
	}
	server := http.Server{
		Handler: gameserver.New(http.Dir(dataDir)),
	}
	go server.Serve(l)
	sc := make(chan os.Signal, 1)
	signal.Notify(sc, os.Interrupt)
	<-sc
	signal.Stop(sc)
	close(sc)
	return server.Shutdown(context.Background())
}
