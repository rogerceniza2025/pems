#!/usr/bin/env node

/**
 * CSS Performance Analysis Script
 * Analyzes CSS bundle sizes and provides optimization recommendations
 */

const fs = require('fs');
const path = require('path');
const { gzipSync, brotliCompressSync } = require('zlib');

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function analyzeCSSFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const size = Buffer.byteLength(content, 'utf8');
  const gzipped = gzipSync(content);
  const brotli = brotliCompressSync(content);

  return {
    path: filePath,
    size,
    sizeFormatted: formatBytes(size),
    gzippedSize: gzipped.length,
    gzippedFormatted: formatBytes(gzipped.length),
    brotliSize: brotli.length,
    brotliFormatted: formatBytes(brotli.length),
    lineCount: content.split('\n').length,
    classCount: (content.match(/\.[\w-]+/g) || []).length,
    variableCount: (content.match(/--[\w-]+/g) || []).length,
  };
}

function findCSSFiles(dir, extensions = ['.css']) {
  const files = [];

  function traverse(currentDir) {
    const items = fs.readdirSync(currentDir);

    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        traverse(fullPath);
      } else if (extensions.some(ext => item.endsWith(ext))) {
        files.push(fullPath);
      }
    }
  }

  traverse(dir);
  return files;
}

function generateRecommendation(analysis) {
  const recommendations = [];

  if (analysis.size > 50000) { // 50KB
    recommendations.push('⚠️  Large CSS file detected. Consider code splitting or removing unused styles.');
  }

  if (analysis.gzippedSize > 15000) { // 15KB
    recommendations.push('📦 Consider optimizing for smaller gzip size. Review for redundancy.');
  }

  if (analysis.lineCount > 2000) {
    recommendations.push('📄 Very long CSS file. Consider breaking into smaller, focused modules.');
  }

  const compressionRatio = (1 - analysis.gzippedSize / analysis.size) * 100;
  if (compressionRatio < 70) {
    recommendations.push('🗜️  Low compression ratio. Check for redundant code or consider minification.');
  }

  if (analysis.classCount > 1000) {
    recommendations.push('🎨 Many CSS classes. Consider using utility-first approach or reducing custom classes.');
  }

  return recommendations;
}

function main() {
  // console.log('🎨 CSS Performance Analysis Report\n');

  const rootDir = process.cwd();
  const distDir = path.join(rootDir, 'dist');
  const srcDir = path.join(rootDir, 'src');

  // Analyze built CSS files
  if (fs.existsSync(distDir)) {
    // console.log('📦 Built CSS Files:');
    const builtFiles = findCSSFiles(distDir, ['.css']);

    if (builtFiles.length === 0) {
      // console.log('  No built CSS files found. Run build first.');
    } else {
      for (const file of builtFiles) {
        const analysis = analyzeCSSFile(file);
        if (analysis) {
          // console.log(`\n📄 ${path.relative(rootDir, analysis.path)}`);
          // console.log(`   Size: ${analysis.sizeFormatted} (gzipped: ${analysis.gzippedFormatted}, brotli: ${analysis.brotliFormatted})`);
          // console.log(`   Lines: ${analysis.lineCount.toLocaleString()}, Classes: ${analysis.classCount.toLocaleString()}, Variables: ${analysis.variableCount.toLocaleString()}`);

          const recommendations = generateRecommendation(analysis);
          if (recommendations.length > 0) {
            // console.log('   Recommendations:');
            // recommendations.forEach(rec => console.log(`     ${rec}`));
          }
        }
      }
    }
  }

  // Analyze source CSS files
  // console.log('\n📝 Source CSS Files:');
  const sourceFiles = findCSSFiles(srcDir, ['.css']);

  // let totalSize = 0;
  // let totalGzipped = 0;

  for (const file of sourceFiles) {
    const analysis = analyzeCSSFile(file);
    if (analysis) {
      // totalSize += analysis.size;
      // totalGzipped += analysis.gzippedSize;

      // console.log(`\n📄 ${path.relative(rootDir, analysis.path)}`);
      // console.log(`   Size: ${analysis.sizeFormatted} (gzipped: ${analysis.gzippedFormatted})`);
      // console.log(`   Lines: ${analysis.lineCount.toLocaleString()}, Classes: ${analysis.classCount.toLocaleString()}`);
    }
  }

  // console.log('\n📊 Summary:');
  // console.log(`   Total Source CSS: ${formatBytes(totalSize)} (gzipped: ${formatBytes(totalGzipped)})`);
  // console.log(`   Compression Ratio: ${((1 - totalGzipped / totalSize) * 100).toFixed(1)}%`);

  // Performance suggestions
  // console.log('\n💡 Performance Tips:');
  // console.log('   • Use CSS containment for better rendering performance');
  // console.log('   • Implement critical CSS inlining for above-the-fold content');
  // console.log('   • Use modern CSS features (container queries, cascade layers)');
  // console.log('   • Leverage browser caching with cache-control headers');
  // console.log('   • Consider using CSS modules for component-scoped styles');

  // console.log('\n🚀 Optimization Complete!');
}

if (require.main === module) {
  main();
}

module.exports = { analyzeCSSFile, findCSSFiles, generateRecommendation };