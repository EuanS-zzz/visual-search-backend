import { ImageAnnotatorClient } from "@google-cloud/vision"

export const runtime = "nodejs"

const client = new ImageAnnotatorClient({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  },
  projectId: process.env.GOOGLE_PROJECT_ID,
})

const PROJECT_ID = process.env.GOOGLE_PROJECT_ID!
const LOCATION = "us-west1"
const PRODUCT_SET_ID = process.env.GOOGLE_PRODUCT_SET_ID!
const PRODUCT_CATEGORY = "apparel"

const productSetPath = `projects/${PROJECT_ID}/locations/${LOCATION}/productSets/${PRODUCT_SET_ID}`

// 🔁 Replace with your real products later
const catalog: any = {
  "black-tee-001": {
    id: "black-tee-001",
    name: "Black Oversized Tee",
    image: "https://via.placeholder.com/300",
    url: "https://your-site.com/product/black-tee",
  },
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get("image") as File

    if (!file) {
      return new Response(JSON.stringify({ error: "No image" }), { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    const [response] = await client.batchAnnotateImages({
      requests: [
        {
          image: { content: buffer.toString("base64") },
          features: [{ type: "PRODUCT_SEARCH" }],
          imageContext: {
            productSearchParams: {
              productSet: productSetPath,
              productCategories: [PRODUCT_CATEGORY],
            },
          },
        },
      ],
    })

    const results =
      response.responses?.[0]?.productSearchResults?.results || []

    const mapped = results
      .map((item: any) => {
        const id = item.product?.name?.split("/").pop()
        if (!id || !catalog[id]) return null

        return {
          ...catalog[id],
          score: item.score,
        }
      })
      .filter(Boolean)

    return new Response(JSON.stringify({ results: mapped }))
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: "Failed" }), { status: 500 })
  }
}
