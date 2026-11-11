'use client'

import { useEffect, useState, useCallback } from 'react'

export type Route =
    | { name: 'home' }
    | { name: 'about' }
    | { name: 'archive' }
    | { name: 'stage'; slug: string }
    | { name: 'ctf' }
    | { name: 'research' }
    | { name: 'cheatsheets' }
    | { name: 'files' }
    | { name: 'links' }
    | { name: 'tags' }
    | { name: 'tag'; tag: string }
    | { name: 'categories' }
    | { name: 'category'; category: string }
    | { name: 'notfound' }

export function parseHash(hash: string): Route {
    const h = hash.replace(/^#/, '').replace(/^\//, '')
    const parts = h.split('/').filter(Boolean)

    if (parts.length === 0) return { name: 'home' }
    if (parts[0] === 'about') return { name: 'about' }
    if (parts[0] === 'archive') return { name: 'archive' }
    if (parts[0] === 'stage' && parts[1])
        return { name: 'stage', slug: decodeURIComponent(parts[1]) }
    if (parts[0] === 'ctf' || parts[0] === 'walkthroughs')
        return { name: 'ctf' }
    if (parts[0] === 'research')
        return { name: 'research' }
    if (parts[0] === 'cheatsheets' || parts[0] === 'cheat-sheets')
        return { name: 'cheatsheets' }
    if (parts[0] === 'files')
        return { name: 'files' }
    if (parts[0] === 'links')
        return { name: 'links' }
    if (parts[0] === 'tags' && parts[1])
        return { name: 'tag', tag: decodeURIComponent(parts[1]) }
    if (parts[0] === 'tags')
        return { name: 'tags' }
    if (parts[0] === 'categories' && parts[1])
        return {
            name: 'category',
            category: decodeURIComponent(parts[1]),
        }
    if (parts[0] === 'categories')
        return { name: 'categories' }

    return { name: 'notfound' }
}

export function routeToHash(route: Route): string {
    switch (route.name) {
        case 'home':
            return '#/'

        case 'about':
            return '#/about'

        case 'archive':
            return '#/archive'

        case 'stage':
            return `#/stage/${encodeURIComponent(route.slug)}`

        case 'ctf':
            return '#/ctf'

        case 'research':
            return '#/research'

        case 'cheatsheets':
            return '#/cheatsheets'

        case 'files':
            return '#/files'

        case 'links':
            return '#/links'

        case 'tags':
            return '#/tags'

        case 'tag':
            return `#/tags/${encodeURIComponent(route.tag)}`

        case 'categories':
            return '#/categories'

        case 'category':
            return `#/categories/${encodeURIComponent(route.category)}`

        case 'notfound':
            return '#/404'
    }
}

export function useRouter() {
    // Same initial route for SSR and first client render
    const [route, setRoute] = useState<Route>({ name: 'home' })

    useEffect(() => {
        const updateRoute = () => {
            setRoute(parseHash(window.location.hash))

            window.scrollTo({
                top: 0,
                behavior: 'instant' as ScrollBehavior,
            })
        }

        // Read hash only after hydration
        updateRoute()

        window.addEventListener('hashchange', updateRoute)

        return () => {
            window.removeEventListener('hashchange', updateRoute)
        }
    }, [])

    const navigate = useCallback((to: Route) => {
        const hash = routeToHash(to)

        if (window.location.hash !== hash) {
            window.location.hash = hash
        } else {
            setRoute(parseHash(hash))
        }
    }, [])

    return {
        route,
        navigate,
    }
}