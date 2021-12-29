package main

import (
	"bytes"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"net/http"
	"os"
)

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

// Question contains all of the data for a single question
type Question struct {
	Category         string   `json:"category"`
	Type             string   `json:"type"`
	Difficulty       string   `json:"difficulty"`
	Question         string   `json:"question"`
	CorrectAnswer    string   `json:"correct_answer"`
	IncorrectAnswers []string `json:"incorrect_answers"`
}

type noNL struct {
	*os.File
}

var (
	nl   = []byte{'\n'}
	none = []byte{}
)

func (n noNL) Write(p []byte) (int, error) {
	return n.File.Write(bytes.ReplaceAll(p, nl, none))
}

func run() error {
	var output string
	flag.StringVar(&output, "o", "otdb.js", "Output file")
	flag.Parse()
	f, err := os.Create(output)
	if err != nil {
		return err
	}
	resp, err := http.DefaultClient.Get("https://opentdb.com/api_count_global.php")
	if err != nil {
		return err
	}
	var amount struct {
		Overall struct {
			Num int `json:"total_num_of_verified_questions"`
		} `json:"overall"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&amount); err != nil {
		return err
	}
	fmt.Printf("Amount to Get: %d\n", amount.Overall.Num)
	resp, err = http.DefaultClient.Get("https://opentdb.com/api_token.php?command=request")
	if err != nil {
		return err
	}
	var token struct {
		ResponseCode    uint8  `json:"response_code"`
		ResponseMessage string `json:"response_message"`
		Token           string `json:"token"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&token); err != nil {
		return err
	}
	if token.ResponseCode != 0 {
		return errors.New(token.ResponseMessage)
	}
	tk := "&token=" + token.Token
	num := "50"
	got := 0
	var questions struct {
		ResponseCode uint8      `json:"response_code"`
		Results      []Question `json:"results"`
	}
	if _, err := f.WriteString("export default ["); err != nil {
		return err
	}
	j := json.NewEncoder(noNL{f})
	for amount.Overall.Num > 0 {
		if amount.Overall.Num < 50 {
			num = fmt.Sprintf("%d", amount.Overall.Num)
		}
		fmt.Printf("\rGot %d results...", got)
		resp, err := http.DefaultClient.Get("https://opentdb.com/api.php?amount=" + num + "&encode=base64" + tk)
		if err != nil {
			return err
		}
		if err := json.NewDecoder(resp.Body).Decode(&questions); err != nil {
			return err
		}
		switch questions.ResponseCode {
		case 0:
			fmt.Printf("retrieved %d more results ", len(questions.Results))
			for _, q := range questions.Results {
				if got > 0 {
					if _, err := f.WriteString(","); err != nil {
						return err
					}
				}
				got++
				if err := j.Encode(q); err != nil {
					return err
				}
			}
			amount.Overall.Num -= len(questions.Results)
			questions.Results = questions.Results[:0]
		case 1:
			return errors.New("no results")
		case 2:
			return errors.New("invalid parameter")
		case 3:
			return errors.New("token not found")
		case 4:
			return errors.New("token empty")
		default:
			return errors.New("unknown error")
		}
	}
	if _, err := f.WriteString("];\n"); err != nil {
		return err
	}
	return f.Close()
}
