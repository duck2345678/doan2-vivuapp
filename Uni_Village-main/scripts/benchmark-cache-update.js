"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const react_query_1 = require("@tanstack/react-query");
const perf_hooks_1 = require("perf_hooks");
// --- Mocks & Utils from Codebase ---
const queryKeys = {
    posts: {
        all: ['posts'],
        feed: (params) => ['posts', 'feed', params],
        my: (params) => ['posts', 'my', params],
        saved: (params) => ['posts', 'saved', params],
    },
};
const isPostCollectionKey = (queryKey) => {
    if (!Array.isArray(queryKey))
        return false;
    const [root, scope] = queryKey;
    return root === queryKeys.posts.all[0] && ['feed', 'my', 'saved'].includes(String(scope));
};
// Current Implementation (Allocates on every page)
const updatePostInInfiniteData_Current = (data, updatedPost) => {
    if (!data || updatedPost.id == null)
        return data;
    let changed = false;
    const pages = data.pages.map((page) => {
        let pageChanged = false;
        // Always allocates a new array
        const content = page.content.map((post) => {
            if (post.id !== updatedPost.id)
                return post;
            pageChanged = true;
            return { ...post, ...updatedPost };
        });
        if (!pageChanged)
            return page; // Discards allocation if no change
        changed = true;
        return { ...page, content };
    });
    return changed ? { ...data, pages } : data;
};
// Optimized Implementation (Checks before allocation)
const updatePostInInfiniteData_Optimized = (data, updatedPost) => {
    if (!data || updatedPost.id == null)
        return data;
    let changed = false;
    const pages = data.pages.map((page) => {
        // Check if post exists in this page
        const matchIndex = page.content.findIndex((p) => p.id === updatedPost.id);
        if (matchIndex === -1)
            return page;
        // Only allocate if we found the post
        changed = true;
        const content = [...page.content];
        content[matchIndex] = { ...content[matchIndex], ...updatedPost };
        return { ...page, content };
    });
    return changed ? { ...data, pages } : data;
};
// --- Benchmark Setup ---
const runBenchmark = async () => {
    console.log('⚡ Starting Cache Update Benchmark (Updater Optimization)...\n');
    const queryClient = new react_query_1.QueryClient({
        defaultOptions: { queries: { staleTime: Infinity } },
    });
    // Setup: 100 relevant queries. Each has 10 pages. Each page has 20 items.
    // Total items per query = 200.
    // Total items tracked = 20,000.
    const RELEVANT_QUERIES = 500;
    const PAGES_PER_QUERY = 10;
    const ITEMS_PER_PAGE = 20;
    console.log(`Populating ${RELEVANT_QUERIES} queries with ${PAGES_PER_QUERY} pages of ${ITEMS_PER_PAGE} items...`);
    for (let i = 0; i < RELEVANT_QUERIES; i++) {
        const pages = [];
        for (let p = 0; p < PAGES_PER_QUERY; p++) {
            const content = [];
            for (let k = 0; k < ITEMS_PER_PAGE; k++) {
                content.push({
                    id: i * 10000 + p * 100 + k, // Unique IDs
                    title: `Post ${k}`
                });
            }
            pages.push({ content });
        }
        const key = ['posts', 'feed', { id: i }];
        queryClient.setQueryData(key, { pages });
    }
    // Pick a post that exists deep in the structure
    // e.g. Query 50, Page 5, Item 10
    const targetId = 50 * 10000 + 5 * 100 + 10;
    const postToUpdate = { id: targetId, title: 'Optimized Post' };
    const ITERATIONS = 200;
    // 1. Measure "Current"
    const startCurrent = perf_hooks_1.performance.now();
    for (let i = 0; i < ITERATIONS; i++) {
        queryClient.setQueriesData({ predicate: (query) => isPostCollectionKey(query.queryKey) }, (data) => updatePostInInfiniteData_Current(data, postToUpdate));
    }
    const endCurrent = perf_hooks_1.performance.now();
    const avgCurrent = (endCurrent - startCurrent) / ITERATIONS;
    console.log(`\n❌ [Current] Map Always (Avg): ${avgCurrent.toFixed(4)} ms`);
    // 2. Measure "Optimized"
    const startOpt = perf_hooks_1.performance.now();
    for (let i = 0; i < ITERATIONS; i++) {
        queryClient.setQueriesData({ predicate: (query) => isPostCollectionKey(query.queryKey) }, (data) => updatePostInInfiniteData_Optimized(data, postToUpdate));
    }
    const endOpt = perf_hooks_1.performance.now();
    const avgOpt = (endOpt - startOpt) / ITERATIONS;
    console.log(`✅ [Optimized] Find Then Map (Avg): ${avgOpt.toFixed(4)} ms`);
    // Report
    const improvement = avgCurrent / avgOpt;
    console.log(`\n🚀 Speedup: ${improvement.toFixed(2)}x faster`);
    if (avgOpt < avgCurrent) {
        console.log('\nResult: PASS - Optimization confirmed.');
    }
    else {
        console.log('\nResult: FAIL - No improvement detected.');
    }
};
runBenchmark().catch(console.error);
