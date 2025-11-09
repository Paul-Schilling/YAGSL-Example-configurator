#!/usr/bin/env python3
"""
embed_assets.py

Read an HTML file (default: index.html), inline local CSS and JS files referenced
by <link rel="stylesheet" href="..."> and <script src="..."></script> into the HTML,
wrapping CSS with <style>...</style> and JS with <script>...</script> so the result is a
single standalone HTML file.

Usage:
    python3 scripts/embed_assets.py index.html -o combined.html

Notes:
- External resources (href/src starting with http://, https://, //) are left unchanged.
- Paths are interpreted relative to the HTML file location.
- The script preserves other script attributes (type, nomodule, defer, etc.) when inlining.
"""

import argparse
import os
import re
import sys


def is_external(path):
    return path.startswith('http://') or path.startswith('https://') or path.startswith('//')


def extract_attr(tag, name):
    m = re.search(r'%s\s*=\s*"([^"]+)"' % re.escape(name), tag, re.I)
    if m:
        return m.group(1)
    m = re.search(r"%s\s*=\s*'([^']+)'" % re.escape(name), tag, re.I)
    if m:
        return m.group(1)
    return None


def inline_css(html, base_dir, verbose=False):
    # Replace <link ...> tags that are stylesheets with <style>content</style>
    def repl(m):
        tag = m.group(0)
        # quick check for rel=stylesheet
        rel = extract_attr(tag, 'rel')
        if not rel or 'stylesheet' not in rel.lower():
            return tag
        href = extract_attr(tag, 'href')
        if not href or is_external(href):
            if verbose:
                print('Skipping external or missing href for link:', href)
            return tag
        file_path = os.path.join(base_dir, href)
        if not os.path.exists(file_path):
            if verbose:
                print('CSS file not found, leaving link as-is:', file_path)
            return tag
        try:
            with open(file_path, 'r', encoding='utf-8') as fh:
                content = fh.read()
        except Exception as e:
            if verbose:
                print('Failed to read CSS file', file_path, e)
            return tag
        return f"<style>\n/* Inlined from {href} */\n{content}\n</style>"

    return re.sub(r'<link\b[^>]*>', repl, html, flags=re.I)


def inline_js(html, base_dir, verbose=False):
    # Replace <script ... src="..."></script> occurrences
    script_re = re.compile(r'<script\b[^>]*src=["\']([^"\']+)["\'][^>]*>\s*</script\s*>', re.I)

    def repl(m):
        full = m.group(0)
        src = m.group(1)
        if not src or is_external(src):
            if verbose:
                print('Skipping external script:', src)
            return full
        file_path = os.path.join(base_dir, src)
        if not os.path.exists(file_path):
            if verbose:
                print('JS file not found, leaving script tag as-is:', file_path)
            return full
        # try to preserve other attributes (type, defer, nomodule, etc.)
        # extract the opening tag attrs
        m_open = re.match(r'<script\b([^>]*)>', full, re.I)
        attrs = m_open.group(1) if m_open else ''
        # remove the src attribute from attrs
        attrs_no_src = re.sub(r'\bsrc=["\'][^"\']+["\']', '', attrs, flags=re.I).strip()
        if attrs_no_src:
            open_tag = f'<script {attrs_no_src}>'
        else:
            open_tag = '<script>'
        try:
            with open(file_path, 'r', encoding='utf-8') as fh:
                content = fh.read()
        except Exception as e:
            if verbose:
                print('Failed to read JS file', file_path, e)
            return full
        return f"{open_tag}\n/* Inlined from {src} */\n{content}\n</script>"

    return script_re.sub(repl, html)


def combine_html(index_path, out_path, verbose=False):
    if not os.path.exists(index_path):
        raise FileNotFoundError(index_path)
    base_dir = os.path.dirname(index_path)
    with open(index_path, 'r', encoding='utf-8') as fh:
        html = fh.read()

    if verbose:
        print('Inlining CSS...')
    html = inline_css(html, base_dir, verbose)
    if verbose:
        print('Inlining JS...')
    html = inline_js(html, base_dir, verbose)

    # Write output
    with open(out_path, 'w', encoding='utf-8') as fh:
        fh.write(html)
    if verbose:
        print('Wrote combined HTML to', out_path)


def parse_args():
    p = argparse.ArgumentParser(description='Inline CSS/JS into a single HTML file')
    p.add_argument('index', nargs='?', default='index.html', help='Path to source HTML (default: index.html)')
    p.add_argument('-o', '--out', default='combined.html', help='Output path (default: combined.html)')
    p.add_argument('-v', '--verbose', action='store_true')
    return p.parse_args()


if __name__ == '__main__':
    args = parse_args()
    try:
        combine_html(args.index, args.out, args.verbose)
    except Exception as e:
        print('Error:', e)
        sys.exit(2)
