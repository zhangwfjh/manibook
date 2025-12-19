"use client"

import * as React from "react"
import { ChevronRight, Plus, Search, X } from "lucide-react"

import { 
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"

type TreeNode = {
  id: string
  name: string
  children?: TreeNode[]
}

interface LibrarySidebarProps extends React.ComponentProps<typeof Sidebar> {
  onAddItem?: (parentId: string | null) => void
  onEditItem?: (id: string) => void
  onDeleteItem?: (id: string) => void
  items?: TreeNode[]
}

export function LibrarySidebar({ 
  onAddItem,
  onEditItem,
  onDeleteItem,
  items = [],
  ...props 
}: LibrarySidebarProps) {
  const [searchTerm, setSearchTerm] = React.useState("")
  const [expandedItems, setExpandedItems] = React.useState<Set<string>>(new Set())
  
  const filteredItems = React.useMemo(() => {
    if (!searchTerm) return items
    
    const filterItems = (nodes: TreeNode[]): TreeNode[] => {
      return nodes
        .map(node => {
          const matches = node.name.toLowerCase().includes(searchTerm.toLowerCase())
          const filteredChildren = node.children ? filterItems(node.children) : []
          
          if (matches || filteredChildren.length > 0) {
            return {
              ...node,
              children: filteredChildren
            }
          }
          return null
        })
        .filter(Boolean) as TreeNode[]
    }
    
    return filterItems(items)
  }, [items, searchTerm])
  
  const toggleExpand = (id: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }
  
  const renderTree = (nodes: TreeNode[], level = 0) => {
    if (!nodes.length) return null
    
    return (
      <SidebarMenuSub>
        {nodes.map((node) => {
          const isExpanded = expandedItems.has(node.id)
          const hasChildren = node.children && node.children.length > 0
          
          return (
            <SidebarMenuSubItem key={node.id} className="py-1">
              <SidebarMenuSubButton
                className={`pl-${level * 4 + 2}`}
                onClick={() => hasChildren && toggleExpand(node.id)}
              >
                {hasChildren && (
                  <ChevronRight 
                    className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
                  />
                )}
                {!hasChildren && <div className="w-4" />}
                <span className="flex-1 truncate">{node.name}</span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={(e) => {
                      e.stopPropagation()
                      onAddItem?.(node.id)
                    }}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={(e) => {
                      e.stopPropagation()
                      onEditItem?.(node.id)
                    }}
                  >
                    <Search className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDeleteItem?.(node.id)
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </SidebarMenuSubButton>
              
              {hasChildren && isExpanded && renderTree(node.children || [], level + 1)}
            </SidebarMenuSubItem>
          )
        })}
      </SidebarMenuSub>
    )
  }
  
  return (
    <Sidebar {...props}>
      <SidebarHeader className="gap-2">
        <div className="relative">
          <SidebarInput
            placeholder="Search tags, genres..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-8 w-8"
              onClick={() => setSearchTerm("")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full"
          onClick={() => onAddItem?.(null)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Item
        </Button>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Library Items</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredItems.length > 0 ? (
                filteredItems.map((item) => {
                  const isExpanded = expandedItems.has(item.id)
                  const hasChildren = item.children && item.children.length > 0
                  
                  return (
                    <SidebarMenuItem key={item.id} className="py-1 group">
                      <SidebarMenuButton
                        onClick={() => hasChildren && toggleExpand(item.id)}
                      >
                        {hasChildren && (
                          <ChevronRight 
                            className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
                          />
                        )}
                        {!hasChildren && <div className="w-4" />}
                        <span className="flex-1 truncate">{item.name}</span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            onClick={(e) => {
                              e.stopPropagation()
                              onAddItem?.(item.id)
                            }}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            onClick={(e) => {
                              e.stopPropagation()
                              onEditItem?.(item.id)
                            }}
                          >
                            <Search className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            onClick={(e) => {
                              e.stopPropagation()
                              onDeleteItem?.(item.id)
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </SidebarMenuButton>
                      
                      {hasChildren && isExpanded && renderTree(item.children || [])}
                    </SidebarMenuItem>
                  )
                })
              ) : (
                <SidebarMenuItem>
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    {searchTerm ? "No matching items found" : "No items yet"}
                  </div>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}