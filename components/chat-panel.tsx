'use client'
import * as React from 'react'
// import { PineconeClient } from '@pinecone-database/pinecone'
import { shareChat } from '@/app/actions'
import { Button } from '@/components/ui/button'
import { PromptForm } from '@/components/prompt-form'
import { ButtonScrollToBottom } from '@/components/button-scroll-to-bottom'
import { IconShare } from '@/components/ui/icons'
import { FooterText } from '@/components/footer'
import { ChatShareDialog } from '@/components/chat-share-dialog'
import { useAIState, useActions, useUIState } from 'ai/rsc'
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import type { AI } from '@/lib/chat/actions'
import { Chroma } from 'langchain/vectorstores/chroma'
import { nanoid } from 'nanoid'
import { UserMessage } from './stocks/message'
// import PdfToText from './pdf-parse'
// import {  } from 'chromadb'
// const { HuggingFaceEmbeddingServerFunction } = require('chromadb')

import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import axios from 'axios'
// const embedder = new HuggingFaceEmbeddingServerFunction({
//   url: 'http://localhost:8001/embed'
// })
// async function initPinecone() {
//   try {
//     const pinecone = await new PineconeClient()

//     await pinecone.init({
//       environment: 'gcp-starter', //this is in the dashboard
//       apiKey: 'f79d782d-402c-4145-96d5-4f757d49a9cb'
//     })

//     return pinecone
//   } catch (error) {
//     console.log('error', error)
//     throw new Error(
//       'Failed to initialize Pinecone Client, please make sure you have the correct environment and api keys'
//     )
//   }
// }
export interface ChatPanelProps {
  id?: string
  title?: string
  input: string
  setInput: (value: string) => void
  isAtBottom: boolean
  scrollToBottom: () => void
}

export function ChatPanel({
  id,
  title,
  input,
  setInput,
  isAtBottom,
  scrollToBottom
}: ChatPanelProps) {
  const [aiState] = useAIState()
  const [messages, setMessages] = useUIState<typeof AI>()
  const { submitUserMessage } = useActions()
  const [shareDialogOpen, setShareDialogOpen] = React.useState(false)

  const exampleMessages = [
    {
      heading: 'What are the',
      subheading: 'trending memecoins today?',
      message: `What are the trending memecoins today?`
    },
    {
      heading: 'What is the price of',
      subheading: '$DOGE right now?',
      message: 'What is the price of $DOGE right now?'
    },
    {
      heading: 'I would like to buy',
      subheading: '42 $DOGE',
      message: `I would like to buy 42 $DOGE`
    },
    {
      heading: 'What are some',
      subheading: `recent events about $DOGE?`,
      message: `What are some recent events about $DOGE?`
    }
  ]
  const inputFile = React.useRef<HTMLInputElement | null>(null)
  const api_url =
    'https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2'
  // const headers = {"Authorization": f"Bearer {hf_token}"}
  const headers = {
    'Content-Type': 'application/json',
    Authorization: 'Bearer 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'
  }
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200
  })
  function readFileAsText(files: FileList): Promise<any[]> {
    return new Promise((resolve, reject) => {
      let setcontent: any[] = []
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const reader = new FileReader()
        reader.onload = async (event: ProgressEvent<FileReader>) => {
          try {
            const content = event.target!.result as string
            const output = await splitter.createDocuments([content])
            setcontent = setcontent.concat(output)

            if (i === files.length - 1) {
              resolve(setcontent)
            }
          } catch (error) {
            console.error(`Error loading content from ${file.name}:`, error)
          }
        }
        reader.onerror = () => {
          reject(reader.error) // Reject with the error
        }
        // Read the file as text
        reader.readAsText(file)
      }
    })
  }

  const uploadtoChroma = async () => {
    if (inputFile.current?.files) {
      const files = inputFile.current.files

      await readFileAsText(files).then(async text => {
        console.log(text)
        // if (!text) return
        // const output = await splitter.createDocuments([text])

        // const embeddings = await embedder.generate(
        //   )
        const texts: any[] = text.map(chunk =>
          chunk.pageContent.replace(/\n/g, ' ')
        )
        const embeddings = await axios.post(
          api_url,
          {
            inputs: texts,
            options: { wait_for_model: true }
          },
          {
            headers: headers
          }
        )
        const vectorStore = await Chroma.fromDocuments(texts, new OpenAIEmbeddings(),, {
          collectionName: 'a-test-collection',
          url: 'http://localhost:8000', // Optional, will default to this value
          collectionMetadata: {
            'hnsw:space': 'cosine'
          } // Optional, can be used to specify the distance method of the embedding space https://docs.trychroma.com/usage-guide#changing-the-distance-function
        })
        console.log('embeddings', embeddings.data)
      })
    }
  }
  return (
    <div className="fixed inset-x-0 bottom-0 w-full bg-gradient-to-b from-muted/30 from-0% to-muted/30 to-50% duration-300 ease-in-out animate-in dark:from-background/10 dark:from-10% dark:to-background/80 peer-[[data-state=open]]:group-[]:lg:pl-[250px] peer-[[data-state=open]]:group-[]:xl:pl-[300px]">
      <ButtonScrollToBottom
        isAtBottom={isAtBottom}
        scrollToBottom={scrollToBottom}
      />

      <div className="mx-auto sm:max-w-2xl sm:px-4">
        <div className="mb-4 grid grid-cols-2 gap-2 px-4 sm:px-0">
          {messages.length === 0 &&
            exampleMessages.map((example, index) => (
              <div
                key={example.heading}
                className={`cursor-pointer rounded-lg border bg-white p-4 hover:bg-zinc-50 dark:bg-zinc-950 dark:hover:bg-zinc-900 ${
                  index > 1 && 'hidden md:block'
                }`}
                onClick={async () => {
                  setMessages(currentMessages => [
                    ...currentMessages,
                    {
                      id: nanoid(),
                      display: <UserMessage>{example.message}</UserMessage>
                    }
                  ])

                  const responseMessage = await submitUserMessage(
                    example.message
                  )

                  setMessages(currentMessages => [
                    ...currentMessages,
                    responseMessage
                  ])
                }}
              >
                <div className="text-sm font-semibold">{example.heading}</div>
                <div className="text-sm text-zinc-600">
                  {example.subheading}
                </div>
              </div>
            ))}
        </div>

        {messages?.length >= 2 ? (
          <div className="flex h-12 items-center justify-center">
            <div className="flex space-x-2">
              {id && title ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => setShareDialogOpen(true)}
                  >
                    <IconShare className="mr-2" />
                    Share
                  </Button>
                  <ChatShareDialog
                    open={shareDialogOpen}
                    onOpenChange={setShareDialogOpen}
                    onCopy={() => setShareDialogOpen(false)}
                    shareChat={shareChat}
                    chat={{
                      id,
                      title,
                      messages: aiState.messages
                    }}
                  />
                </>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="space-y-4 border-t bg-background px-4 py-2 shadow-lg sm:rounded-t-xl sm:border md:py-4">
          <PromptForm
            input={input}
            setInput={setInput}
            handlefile={uploadtoChroma}
            inputFile={inputFile}
          />
          <FooterText className="hidden sm:block" />
        </div>
      </div>
    </div>
  )
}
