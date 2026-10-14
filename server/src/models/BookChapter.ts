import { Schema, model, type InferSchemaType } from 'mongoose'

// One published chapter. `content` is the chapter document (see
// src/components/books/chapter/types.ts in the web app); it is written only by
// scripts/publish-chapter.ts and read only through the gated chapter route.
const bookChapterSchema = new Schema(
  {
    bookSlug: { type: String, required: true, trim: true, maxlength: 120 },
    number: { type: Number, required: true, min: 1 },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    free: { type: Boolean, required: true, default: false },
    content: { type: Schema.Types.Mixed, required: true },
    words: { type: Number, required: true, default: 0 },
    revision: { type: Number, required: true, default: 1 },
    publishedAt: { type: Date, required: true, default: () => new Date() },
  },
  { timestamps: true, minimize: false },
)

bookChapterSchema.index({ bookSlug: 1, number: 1 }, { unique: true })

export type BookChapter = InferSchemaType<typeof bookChapterSchema>

export const BookChapterModel = model('BookChapter', bookChapterSchema)
