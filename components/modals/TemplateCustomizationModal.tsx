'use client';

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Template, TemplateVariable } from '@/types';
import { AnimatedBorder } from '@/components/ui';
import styles from './TemplateCustomizationModal.module.css';

interface TemplateCustomizationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (
        prompt: string,
        attachedImages: { id: string; file: File; preview: string }[],
        category: string | null,
        tone: string | null
    ) => void;
    template: Template | null;
    theme?: 'light' | 'dark';
}

interface VariableValue {
    text?: string;
    image?: { file: File; preview: string } | null;
    imageDescription?: string; // Alternative text description for image
}

export default function TemplateCustomizationModal({
    isOpen,
    onClose,
    onSubmit,
    template,
    theme = 'light'
}: TemplateCustomizationModalProps) {
    // State for variable values
    const [values, setValues] = useState<Record<string, VariableValue>>({});
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [dragOver, setDragOver] = useState<string | null>(null);

    const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

    // Initialize default values from placeholders when template changes
    const initializeValues = useCallback(() => {
        if (!template?.variables) return;

        const initialValues: Record<string, VariableValue> = {};
        template.variables.forEach(variable => {
            if (variable.type === 'text' && variable.placeholder) {
                initialValues[variable.id] = { text: variable.placeholder };
            }
        });
        setValues(initialValues);
        setErrors({});
    }, [template]);

    // Reset values when modal opens
    useState(() => {
        if (isOpen && template) {
            initializeValues();
        }
    });

    // Handle text input change
    const handleTextChange = useCallback((variableId: string, value: string) => {
        setValues(prev => ({
            ...prev,
            [variableId]: { ...prev[variableId], text: value }
        }));
        // Clear error when user types
        if (errors[variableId]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[variableId];
                return newErrors;
            });
        }
    }, [errors]);

    // Handle image upload
    const handleImageUpload = useCallback((variableId: string, file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            setValues(prev => ({
                ...prev,
                [variableId]: {
                    ...prev[variableId],
                    image: { file, preview: e.target?.result as string }
                }
            }));
            // Clear error
            if (errors[variableId]) {
                setErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors[variableId];
                    return newErrors;
                });
            }
        };
        reader.readAsDataURL(file);
    }, [errors]);

    // Handle image remove
    const handleRemoveImage = useCallback((variableId: string) => {
        setValues(prev => ({
            ...prev,
            [variableId]: { ...prev[variableId], image: null }
        }));
    }, []);

    // Handle file input change
    const handleFileChange = useCallback((variableId: string, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type.startsWith('image/')) {
            handleImageUpload(variableId, file);
        }
        // Reset input
        e.target.value = '';
    }, [handleImageUpload]);

    // Handle drag and drop
    const handleDragOver = useCallback((e: React.DragEvent, variableId: string) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(variableId);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(null);
    }, []);

    const handleDrop = useCallback((variableId: string, e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(null);

        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith('image/')) {
            handleImageUpload(variableId, file);
        }
    }, [handleImageUpload]);

    // Validate and submit
    const handleSubmit = useCallback(() => {
        if (!template) return;

        const variables = template.variables || [];
        const newErrors: Record<string, string> = {};

        // Validate required fields
        variables.forEach(variable => {
            if (variable.required) {
                if (variable.type === 'text') {
                    const textValue = values[variable.id]?.text?.trim();
                    if (!textValue) {
                        newErrors[variable.id] = `${variable.label} is required`;
                    }
                } else if (variable.type === 'image') {
                    // Accept either image upload OR text description
                    const hasImage = !!values[variable.id]?.image;
                    const hasDescription = !!values[variable.id]?.imageDescription?.trim();
                    if (!hasImage && !hasDescription) {
                        newErrors[variable.id] = `Upload an image or describe it`;
                    }
                }
            }
        });

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        // First, collect all images and assign them image_1, image_2, etc. in order
        const imageVariableIds: string[] = [];
        variables.forEach(variable => {
            if (variable.type === 'image' && values[variable.id]?.image) {
                imageVariableIds.push(variable.id);
            }
        });

        // Substitute variables into prompt
        let finalPrompt = template.prompt || '';

        // Replace {{variable_id}} with actual values
        variables.forEach(variable => {
            if (variable.type === 'text') {
                const userValue = values[variable.id]?.text?.trim() || '';
                const placeholderValue = variable.placeholder || '';

                // If user didn't change from placeholder (or left empty), don't substitute
                // This lets the backend/model use its default interpretation
                if (!userValue || userValue === placeholderValue) {
                    // Keep the {{variable_id}} as-is for the model to interpret as default
                    // Or remove it if the variable isn't required
                    if (!variable.required) {
                        finalPrompt = finalPrompt.replace(
                            new RegExp(`{{${variable.id}}}`, 'g'),
                            ''
                        );
                    }
                    // For required with placeholder, use the placeholder value
                    else if (placeholderValue) {
                        finalPrompt = finalPrompt.replace(
                            new RegExp(`{{${variable.id}}}`, 'g'),
                            placeholderValue
                        );
                    }
                } else {
                    // User provided a custom value, use it
                    finalPrompt = finalPrompt.replace(
                        new RegExp(`{{${variable.id}}}`, 'g'),
                        userValue
                    );
                }
            }
            // For image variables: use image_1, image_2, etc. based on attachment order
            if (variable.type === 'image') {
                const hasImage = !!values[variable.id]?.image;
                const description = values[variable.id]?.imageDescription?.trim() || '';

                if (hasImage) {
                    // Find the index of this image in the collected images (1-based)
                    const imageIndex = imageVariableIds.indexOf(variable.id) + 1;
                    finalPrompt = finalPrompt.replace(
                        new RegExp(`{{${variable.id}}}`, 'g'),
                        `image_${imageIndex}`
                    );
                } else if (description) {
                    // User provided a text description instead
                    finalPrompt = finalPrompt.replace(
                        new RegExp(`{{${variable.id}}}`, 'g'),
                        description
                    );
                } else {
                    // No image and no description - remove the placeholder
                    finalPrompt = finalPrompt.replace(
                        new RegExp(`{{${variable.id}}}`, 'g'),
                        ''
                    );
                }
            }
        });

        // Collect attached images in the same order as imageVariableIds
        const attachedImages: { id: string; file: File; preview: string }[] = [];
        imageVariableIds.forEach(variableId => {
            const img = values[variableId]?.image;
            if (img) {
                attachedImages.push({
                    id: variableId,
                    file: img.file,
                    preview: img.preview
                });
            }
        });

        // Call onSubmit with the processed prompt and images
        onSubmit(
            finalPrompt.trim(),
            attachedImages,
            template.category || null,
            template.tone || null
        );
    }, [template, values, onSubmit]);

    // Render variable input
    const renderVariableInput = (variable: TemplateVariable) => {
        const hasError = !!errors[variable.id];

        if (variable.type === 'image') {
            const imageValue = values[variable.id]?.image;

            return (
                <div key={variable.id} className={styles.variableGroup}>
                    <div className={styles.labelRow}>
                        <label className={styles.label}>{variable.label}</label>
                        {variable.required ? (
                            <span className={styles.requiredBadge}>Required</span>
                        ) : (
                            <span className={styles.optionalBadge}>Optional</span>
                        )}
                    </div>
                    {variable.description && (
                        <p className={styles.description}>{variable.description}</p>
                    )}

                    {imageValue ? (
                        <div className={styles.uploadedPreview}>
                            <Image
                                src={imageValue.preview}
                                alt={variable.label}
                                fill
                                className={styles.uploadedImage}
                            />
                            <button
                                className={styles.removeImageButton}
                                onClick={() => handleRemoveImage(variable.id)}
                                type="button"
                                aria-label="Remove image"
                            >
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M18 6L6 18M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    ) : (
                        <>
                            <input
                                ref={el => { fileInputRefs.current[variable.id] = el; }}
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleFileChange(variable.id, e)}
                                style={{ display: 'none' }}
                            />
                            <div
                                className={`${styles.imageDropzone} ${dragOver === variable.id ? styles.imageDropzoneDragging : ''} ${hasError && !values[variable.id]?.imageDescription ? styles.inputError : ''}`}
                                onClick={() => fileInputRefs.current[variable.id]?.click()}
                                onDragOver={(e) => handleDragOver(e, variable.id)}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDrop(variable.id, e)}
                            >
                                <svg className={styles.dropzoneIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                                    <polyline points="17 8 12 3 7 8" />
                                    <line x1="12" y1="3" x2="12" y2="15" />
                                </svg>
                                <p className={styles.dropzoneText}>
                                    <span className={styles.dropzoneTextAccent}>Click to upload</span> or drag and drop
                                </p>
                            </div>

                            {/* Alternative: describe the image */}
                            <div className={styles.orDivider}>
                                <span>or describe it</span>
                            </div>
                            <input
                                type="text"
                                className={styles.descriptionInput}
                                value={values[variable.id]?.imageDescription || ''}
                                onChange={(e) => setValues(prev => ({
                                    ...prev,
                                    [variable.id]: { ...prev[variable.id], imageDescription: e.target.value }
                                }))}
                                placeholder={`e.g., "a person looking surprised"`}
                            />
                        </>
                    )}
                    {hasError && <p className={styles.errorText}>{errors[variable.id]}</p>}
                </div>
            );
        }

        // Text input
        return (
            <div key={variable.id} className={styles.variableGroup}>
                <div className={styles.labelRow}>
                    <label className={styles.label}>{variable.label}</label>
                    {variable.required ? (
                        <span className={styles.requiredBadge}>Required</span>
                    ) : (
                        <span className={styles.optionalBadge}>Optional</span>
                    )}
                </div>
                {variable.description && (
                    <p className={styles.description}>{variable.description}</p>
                )}
                <input
                    type="text"
                    className={`${styles.textInput} ${hasError ? styles.inputError : ''}`}
                    value={values[variable.id]?.text || ''}
                    onChange={(e) => handleTextChange(variable.id, e.target.value)}
                    placeholder={variable.placeholder || `Enter ${variable.label.toLowerCase()}`}
                />
                {hasError && <p className={styles.errorText}>{errors[variable.id]}</p>}
            </div>
        );
    };

    if (!isOpen || !template) return null;

    const variables = template.variables || [];
    const hasVariables = variables.length > 0;

    return (
        <div
            className={`${styles.overlay} ${theme === 'dark' ? styles.darkTheme : ''}`}
            onClick={onClose}
        >
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                {/* Hero Header */}
                <div className={styles.header}>
                    <div className={styles.templatePreview}>
                        {template.image && (
                            <Image
                                src={template.image}
                                alt={template.title}
                                fill
                                className={styles.templatePreviewImage}
                            />
                        )}
                        <div className={styles.templatePreviewOverlay} />
                    </div>
                    <div className={styles.headerContent}>
                        <h2 className={styles.title}>
                            Customize <span className={styles.titleAccent}>{template.title}</span>
                        </h2>
                        <p className={styles.subtitle}>
                            {hasVariables
                                ? 'Fill in the details below to personalize your thumbnail'
                                : 'This template is ready to use!'}
                        </p>
                    </div>
                    <button
                        className={styles.closeButton}
                        onClick={onClose}
                        aria-label="Close modal"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className={styles.content}>
                    {hasVariables ? (
                        variables.map(renderVariableInput)
                    ) : (
                        <p className={styles.subtitle}>
                            Click &quot;Create Project&quot; to start using this template.
                        </p>
                    )}
                </div>

                {/* Footer */}
                <div className={styles.footer}>
                    <AnimatedBorder radius={14} borderWidth={1.5} gap={2} borderColor="#d5d5d5" fullWidth>
                        <button className={styles.cancelButton} onClick={onClose}>
                            Cancel
                        </button>
                    </AnimatedBorder>
                    <AnimatedBorder radius={14} borderWidth={1.5} gap={2} borderColor="#ff6f61" fullWidth>
                        <button className={styles.createButton} onClick={handleSubmit}>
                            Create Project
                        </button>
                    </AnimatedBorder>
                </div>
            </div>
        </div>
    );
}
