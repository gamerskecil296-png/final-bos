import React, { useState, useEffect } from 'react';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';

export default function SeoAnalysis({ 
    title, 
    content, 
    slug, 
    metaDescription, 
    focusKeyword,
    onSlugChange,
    onMetaChange,
    onKeywordChange
}) {
    const [analysis, setAnalysis] = useState([]);
    
    // Robust text extraction from HTML content
    const plainTextContent = React.useMemo(() => {
        if (!content) return '';
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = content;
        return tempDiv.textContent || tempDiv.innerText || "";
    }, [content]);
    
    const wordCount = plainTextContent.split(/\s+/).filter(word => word.length > 0).length;

    // Helper to add results
    const calculateSeo = () => {
        const results = [];
        
        // 1. Focus Keyword Checks
        if (!focusKeyword || focusKeyword.trim() === '') {
            results.push({ status: 'red', text: 'Set a focus keyword to get SEO analysis.' });
        } else {
            const keywordLower = focusKeyword.toLowerCase();
            
            // Keyword in Title
            if (title && title.toLowerCase().includes(keywordLower)) {
                results.push({ status: 'green', text: 'Focus keyword appears in the SEO title.' });
            } else {
                results.push({ status: 'red', text: 'Focus keyword does not appear in the SEO title.' });
            }
            
            // Keyword in Meta Description
            if (metaDescription && metaDescription.toLowerCase().includes(keywordLower)) {
                results.push({ status: 'green', text: 'Focus keyword appears in the meta description.' });
            } else {
                results.push({ status: 'orange', text: 'Focus keyword does not appear in the meta description.' });
            }
            
            // Keyword in Content
            const keywordCount = (plainTextContent.toLowerCase().match(new RegExp(keywordLower, "g")) || []).length;
            if (keywordCount > 0) {
                results.push({ status: 'green', text: `Focus keyword found ${keywordCount} times in the content.` });
            } else {
                results.push({ status: 'red', text: 'Focus keyword was found 0 times in the content.' });
            }
        }

        // 2. Meta Description Length
        const metaLen = metaDescription ? metaDescription.length : 0;
        if (metaLen === 0) {
            results.push({ status: 'red', text: 'No meta description has been specified. Search engines will display copy from the page instead.' });
        } else if (metaLen < 120) {
            results.push({ status: 'orange', text: 'The meta description is under 120 characters long. However, up to 156 characters are available.' });
        } else if (metaLen > 156) {
            results.push({ status: 'orange', text: 'The meta description is over 156 characters. Reducing the length will ensure the entire description is visible.' });
        } else {
            results.push({ status: 'green', text: 'The meta description length is well within the recommended range.' });
        }

        // 3. Title Length
        const titleLen = title ? title.length : 0;
        if (titleLen === 0) {
            results.push({ status: 'red', text: 'Please create an SEO title.' });
        } else if (titleLen < 30) {
            results.push({ status: 'orange', text: 'The SEO title is too short. Use the space to add keyword variations or create compelling call-to-action copy.' });
        } else if (titleLen > 60) {
            results.push({ status: 'orange', text: 'The SEO title is wider than the viewable limit.' });
        } else {
            results.push({ status: 'green', text: 'The SEO title is a good length.' });
        }

        // 4. Content Length
        if (wordCount < 300) {
            results.push({ status: 'orange', text: `The text contains ${wordCount} words. This is below the recommended minimum of 300 words.` });
        } else {
            results.push({ status: 'green', text: `The text contains ${wordCount} words. Good job!` });
        }

        setAnalysis(results);
    };

    useEffect(() => {
        calculateSeo();
    }, [title, plainTextContent, metaDescription, focusKeyword]);

    const getStatusIcon = (status) => {
        switch(status) {
            case 'green': return <div className="w-3 h-3 rounded-full bg-emerald-500 mt-1 shrink-0" />;
            case 'orange': return <div className="w-3 h-3 rounded-full bg-amber-500 mt-1 shrink-0" />;
            case 'red': return <div className="w-3 h-3 rounded-full bg-rose-500 mt-1 shrink-0" />;
            default: return <div className="w-3 h-3 rounded-full bg-slate-300 mt-1 shrink-0" />;
        }
    }

    return (
        <div className="border border-slate-200 rounded-xl bg-white overflow-hidden font-inter mt-6">
            <div className="bg-slate-50 border-b border-slate-200 p-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-600">troubleshoot</span>
                <h3 className="font-bold text-sm text-slate-800">SEO Analysis</h3>
            </div>
            
            <div className="p-5 space-y-6">
                {/* Focus Keyword */}
                <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-600">Focus keyphrase</Label>
                    <Input 
                        value={focusKeyword} 
                        onChange={(e) => onKeywordChange(e.target.value)} 
                        placeholder="Enter a focus keyphrase" 
                        className="h-10 rounded-lg"
                    />
                </div>

                {/* Google Preview */}
                <div className="space-y-3">
                    <Label className="text-xs font-bold text-slate-600 flex justify-between">
                        <span>Google preview</span>
                        <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded">Desktop result</span>
                    </Label>
                    <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm font-sans max-w-[600px]">
                        <div className="text-[12px] text-slate-600 mb-1 truncate">
                            https://bkustudenthub.com/news/{slug || 'url-slug-example'}
                        </div>
                        <div className="text-[18px] text-[#1a0dab] font-medium hover:underline cursor-pointer truncate">
                            {title || 'Please provide a title'}
                        </div>
                        <div className="text-[13px] text-[#4d5156] mt-1 leading-[1.58] line-clamp-2 break-words">
                            {metaDescription || 'Please provide a meta description by editing the snippet below. If you don\'t, Google will try to find a relevant part of your post to show in the search results.'}
                        </div>
                    </div>
                </div>

                {/* Slug & Meta Description */}
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-600">Slug</Label>
                        <Input 
                            value={slug} 
                            onChange={(e) => onSlugChange(e.target.value)} 
                            placeholder="url-slug-example" 
                            className="h-10 rounded-lg"
                        />
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <Label className="text-xs font-bold text-slate-600">Meta description</Label>
                            <span className={`text-[10px] font-bold ${metaDescription?.length > 156 ? 'text-rose-500' : 'text-slate-400'}`}>
                                {metaDescription?.length || 0} / 156
                            </span>
                        </div>
                        <Textarea 
                            value={metaDescription} 
                            onChange={(e) => onMetaChange(e.target.value)} 
                            placeholder="Modify your meta description by editing it right here" 
                            className="h-24 rounded-lg resize-none"
                        />
                    </div>
                </div>

                {/* SEO Analysis Results */}
                <div className="pt-4 border-t border-slate-200">
                    <h4 className="text-xs font-bold text-slate-800 mb-3 flex items-center gap-2">
                        SEO analysis 
                        <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full">Good</span>
                    </h4>
                    <ul className="space-y-3">
                        {analysis.map((item, idx) => (
                            <li key={idx} className="flex gap-3 text-sm text-slate-600 leading-relaxed">
                                {getStatusIcon(item.status)}
                                <span>{item.text}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}
