import sys
user_name = sys.argv[2]

def openAI(text):
  import os
  import openai
  openai.api_key = os.environ.get("OPENAI_API_KEY")

  bot_name = "Dokki"

  response = openai.Completion.create(
    engine="davinci",
    prompt=text,
    temperature=0.9,
    max_tokens=150,
    top_p=1,
    frequency_penalty=0.47,
    presence_penalty=0.08,
    stop=["\n", " User:", " {0}:".format(bot_name)]
  )

  print(vars(response)['_previous']['choices'][0]['text'])

if sys.argv[3] == "openAI":
  openAI(sys.argv[1]) #[2] is name

sys.stdout.flush()
