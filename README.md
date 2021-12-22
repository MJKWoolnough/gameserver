# gameserver
--
    import "vimagination.zapto.org/gameserver"

Package gameserver implements a simple messaging server to be used with several
built in games.

## Usage

#### func  New

```go
func New(dataDir http.FileSystem) *http.ServeMux
```
New create a new gameserver mux, with the given dataDir used for data required
by the games
