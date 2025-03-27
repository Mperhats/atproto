# Catalog App PRD (Product Requirements Document)

## Overview
The Catalog App is an AT Protocol-based application that allows users to create and browse catalogs of items. This app leverages the AT Protocol's actor model and record system to enable a distributed, decentralized approach to product catalogs.

## Core Concepts

### Actor Model
The app reuses the actor model from Bluesky directly, where:
- Each user has a DID (Decentralized Identifier)
- Users can create catalogs containing multiple catalog items
- Authentication and identity are handled by the AT Protocol

### Catalog Structure
A catalog is a collection of catalog items created by a user. Each catalog item is structured similarly to a post but with additional product-specific fields such as price.

## Data Structures

### Lexicons

#### 1. `xyz.nosh.catalog.item` - Catalog Item Record
```json
{
  "lexicon": 1,
  "id": "xyz.nosh.catalog.item",
  "defs": {
    "main": {
      "type": "record",
      "description": "Record containing a catalog item.",
      "key": "tid",
      "record": {
        "type": "object",
        "required": ["title", "description", "price", "createdAt"],
        "properties": {
          "title": {
            "type": "string",
            "maxLength": 300,
            "maxGraphemes": 60,
            "description": "The title of the catalog item."
          },
          "description": {
            "type": "string",
            "maxLength": 3000,
            "maxGraphemes": 300,
            "description": "Detailed description of the catalog item."
          },
          "price": {
            "type": "string",
            "description": "Price of the item (formatted as string to support different currencies)."
          },
          "currency": {
            "type": "string",
            "maxLength": 3,
            "description": "Currency code (e.g., USD, EUR, JPY)."
          },
          "facets": {
            "type": "array",
            "description": "Annotations of text (mentions, URLs, hashtags, etc)",
            "items": { "type": "ref", "ref": "app.bsky.richtext.facet" }
          },
          "embed": {
            "type": "union",
            "description": "Media attachments for the catalog item.",
            "refs": [
              "app.bsky.embed.images",
              "app.bsky.embed.external"
            ]
          },
          "tags": {
            "type": "array",
            "description": "Tags to categorize the catalog item.",
            "maxLength": 8,
            "items": { "type": "string", "maxLength": 640, "maxGraphemes": 64 }
          },
          "createdAt": {
            "type": "string",
            "format": "datetime",
            "description": "When this catalog item was created."
          }
        }
      }
    }
  }
}
```

#### 2. `xyz.nosh.catalog.defs` - Catalog Definitions
```json
{
  "lexicon": 1,
  "id": "xyz.nosh.catalog.defs",
  "defs": {
    "catalogItemView": {
      "type": "object",
      "required": ["uri", "cid", "author", "record", "indexedAt"],
      "properties": {
        "uri": { "type": "string", "format": "at-uri" },
        "cid": { "type": "string", "format": "cid" },
        "author": {
          "type": "ref",
          "ref": "app.bsky.actor.defs#profileViewBasic"
        },
        "record": { "type": "unknown" },
        "embed": {
          "type": "union",
          "refs": [
            "app.bsky.embed.images#view",
            "app.bsky.embed.external#view"
          ]
        },
        "indexedAt": { "type": "string", "format": "datetime" },
        "labels": {
          "type": "array",
          "items": { "type": "ref", "ref": "com.atproto.label.defs#label" }
        }
      }
    },
    "catalogFeed": {
      "type": "object",
      "required": ["items"],
      "properties": {
        "items": {
          "type": "array",
          "items": { "type": "ref", "ref": "#catalogItemView" }
        },
        "cursor": { "type": "string" }
      }
    }
  }
}
```

#### 3. `xyz.nosh.catalog.getCatalog` - Get Catalog Items Query
```json
{
  "lexicon": 1,
  "id": "xyz.nosh.catalog.getCatalog",
  "defs": {
    "main": {
      "type": "query",
      "description": "Get catalog items, optionally filtered by user DID.",
      "parameters": {
        "type": "params",
        "properties": {
          "actor": {
            "type": "string",
            "format": "did",
            "description": "The DID of the user whose catalog items to fetch."
          },
          "limit": {
            "type": "integer",
            "minimum": 1,
            "maximum": 100,
            "default": 50,
            "description": "Maximum number of catalog items to return."
          },
          "cursor": {
            "type": "string",
            "description": "Pagination cursor from a previous request."
          },
          "tags": {
            "type": "array",
            "description": "Filter catalog items by tags.",
            "items": { "type": "string" }
          }
        }
      },
      "output": {
        "encoding": "application/json",
        "schema": {
          "type": "object",
          "required": ["feed"],
          "properties": {
            "cursor": { "type": "string" },
            "feed": { "type": "ref", "ref": "xyz.nosh.catalog.defs#catalogFeed" }
          }
        }
      }
    }
  }
}
```

#### 4. `xyz.nosh.catalog.createItem` - Create Catalog Item Procedure
```json
{
  "lexicon": 1,
  "id": "xyz.nosh.catalog.createItem",
  "defs": {
    "main": {
      "type": "procedure",
      "description": "Create a new catalog item.",
      "input": {
        "encoding": "application/json",
        "schema": {
          "type": "object",
          "required": ["title", "description", "price", "currency"],
          "properties": {
            "title": {
              "type": "string",
              "maxLength": 300,
              "maxGraphemes": 60
            },
            "description": {
              "type": "string",
              "maxLength": 3000,
              "maxGraphemes": 300
            },
            "price": {
              "type": "string"
            },
            "currency": {
              "type": "string",
              "maxLength": 3
            },
            "facets": {
              "type": "array",
              "items": { "type": "ref", "ref": "app.bsky.richtext.facet" }
            },
            "embed": {
              "type": "union",
              "refs": [
                "app.bsky.embed.images",
                "app.bsky.embed.external"
              ]
            },
            "tags": {
              "type": "array",
              "maxLength": 8,
              "items": { "type": "string", "maxLength": 640, "maxGraphemes": 64 }
            }
          }
        }
      },
      "output": {
        "encoding": "application/json",
        "schema": {
          "type": "object",
          "required": ["uri", "cid"],
          "properties": {
            "uri": { "type": "string", "format": "at-uri" },
            "cid": { "type": "string", "format": "cid" }
          }
        }
      }
    }
  }
}
```

## User Flows

### Creating a Catalog Item
1. User authenticates with their AT Protocol account
2. User creates a new catalog item with title, description, price, and optional images
3. The app uses the `xyz.nosh.catalog.createItem` procedure to create the item
4. The item is stored in the user's repository on the AT Protocol network

### Browsing Catalogs
1. User can view catalogs by individual users (actors) or browse a global feed
2. The app uses the `xyz.nosh.catalog.getCatalog` query to fetch catalog items
3. Results are displayed in a grid or list format with item details

### Interacting with Items
1. Users can view catalog item details including images, price, and description
2. Future versions could include messaging or purchase functionality

## Technical Architecture

### Frontend
- React Native / Expo app for mobile platforms
- Uses the AT Protocol client libraries for authentication and API calls
- Implements the lexicons defined above for data handling

### Backend
- Leverages the AT Protocol infrastructure
- AppView service for indexing and querying catalog items
- No separate backend needed beyond AT Protocol services

## Future Considerations
- Support for more complex pricing (discounts, variants)
- Purchase workflow integration
- Integration with payment processors
- Enhanced search and filtering capabilities
- Review and rating system for items and sellers

## MVP Features
- User authentication with AT Protocol
- Creating basic catalog items with images
- Browsing catalogs by user
- Basic filtering by tags 