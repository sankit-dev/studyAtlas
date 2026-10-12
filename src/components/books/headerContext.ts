import { createContext, type ReactNode } from 'react'

/** The site's own header, handed down so books pages keep the main nav. */
export const BooksHeaderContext = createContext<ReactNode>(null)
