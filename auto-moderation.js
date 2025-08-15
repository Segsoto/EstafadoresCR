// Sistema de Moderación Automática con Hugging Face
// 100% GRATUITO - Sin costos adicionales

class AutoModerationService {
    constructor() {
        // API gratuita de Hugging Face
        this.HF_API_URL = 'https://api-inference.huggingface.co/models';
        this.HF_TOKEN = process.env.HUGGING_FACE_TOKEN; // Opcional, funciona sin token pero con límites
    }

    // Análisis de sentimientos y detección de contenido
    async moderateReport(report) {
        try {
            console.log(`🤖 Moderando reporte automáticamente: ${report.name || 'sin nombre'}`);
            
            // Normalizar nombres de propiedades
            const phoneNumber = report.phone_number || report.phone;
            const description = report.description;
            const scamType = report.scam_type || report.company;
            
            // 1. Validaciones básicas (instantáneas)
            const basicCheck = this.basicValidation(phoneNumber, description);
            if (basicCheck.decision !== 'CONTINUE') {
                return basicCheck;
            }

            // 2. Análisis con IA de Hugging Face
            const aiAnalysis = await this.analyzeWithAI(description);
            
            // 3. Combinar resultados y tomar decisión
            const finalDecision = this.makeModerationDecision(basicCheck, aiAnalysis, report);
            
            console.log(`🎯 Decisión automática: ${finalDecision.status} (${finalDecision.confidence}% confianza)`);
            return finalDecision;
            
        } catch (error) {
            console.error('❌ Error en moderación automática:', error);
            // Si falla la IA, enviar a moderación manual por seguridad
            return {
                status: 'flagged',
                confidence: 0.5,
                reason: 'Error en análisis automático - requiere revisión manual',
                requiresManualReview: true
            };
        }
    }

    // Validaciones básicas sin IA
    basicValidation(phoneNumber, description) {
        const issues = [];
        
        // Validar número de teléfono
        if (!phoneNumber || phoneNumber.length < 8) {
            issues.push('Número demasiado corto');
        }
        
        if (phoneNumber && !/^[0-9\-\s\+\(\)]{8,15}$/.test(phoneNumber)) {
            issues.push('Formato de número inválido');
        }
        
        // Números obviamente falsos
        const fakeNumbers = ['12345678', '00000000', '11111111', '99999999'];
        if (phoneNumber && fakeNumbers.includes(phoneNumber.replace(/[^0-9]/g, ''))) {
            issues.push('Número claramente falso');
        }
        
        // Validar descripción
        if (!description || description.trim().length < 10) {
            issues.push('Descripción demasiado corta');
        }
        
        if (description && description.length > 2000) {
            issues.push('Descripción demasiado larga');
        }
        
        // Detectar spam obvio
        if (description) {
            const spamPatterns = [
                /(.)\1{10,}/i, // Caracteres repetidos
                /^[A-Z\s!]{50,}$/i, // Solo mayúsculas y exclamaciones
                /https?:\/\/[^\s]+/i, // URLs (sospechoso en reportes)
            ];
            
            for (const pattern of spamPatterns) {
                if (pattern.test(description)) {
                    issues.push('Posible spam detectado');
                    break;
                }
            }
        }
        
        // Decisión básica
        if (issues.length === 0) {
            return { decision: 'CONTINUE', score: 0.8, issues: [] };
        } else if (issues.length >= 3) {
            return { 
                action: 'rejected', 
                confidence: 0.1, 
                reason: issues.join(', '),
                requiresManualReview: false
            };
        } else {
            return { 
                action: 'flagged', 
                confidence: 0.5, 
                reason: issues.join(', '),
                requiresManualReview: true
            };
        }
    }

    // Análisis con IA de Hugging Face (GRATIS)
    async analyzeWithAI(text) {
        try {
            // Análisis múltiple en paralelo
            const [sentimentResult, toxicityResult, spamResult] = await Promise.all([
                this.analyzeSentiment(text),
                this.analyzeToxicity(text),
                this.analyzeSpam(text)
            ]);

            return {
                sentiment: sentimentResult,
                toxicity: toxicityResult,
                spam: spamResult,
                overallScore: (sentimentResult.score + toxicityResult.score + spamResult.score) / 3
            };
        } catch (error) {
            console.error('Error en análisis de IA:', error);
            return {
                sentiment: { score: 0.5, label: 'unknown' },
                toxicity: { score: 0.5, label: 'unknown' },
                spam: { score: 0.5, label: 'unknown' },
                overallScore: 0.5
            };
        }
    }

    // Análisis de sentimientos
    async analyzeSentiment(text) {
        try {
            const response = await fetch(`${this.HF_API_URL}/cardiffnlp/twitter-roberta-base-sentiment-latest`, {
                method: 'POST',
                headers: {
                    'Authorization': this.HF_TOKEN ? `Bearer ${this.HF_TOKEN}` : undefined,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ inputs: text })
            });

            const result = await response.json();
            
            if (result && result[0]) {
                const topResult = result[0].reduce((prev, current) => 
                    (prev.score > current.score) ? prev : current
                );
                
                // Convertir a puntuación útil para moderación
                let score = 0.5;
                if (topResult.label === 'LABEL_0') score = 0.3; // Negativo
                if (topResult.label === 'LABEL_1') score = 0.5; // Neutral  
                if (topResult.label === 'LABEL_2') score = 0.7; // Positivo
                
                return { score, label: topResult.label, confidence: topResult.score };
            }
            
            return { score: 0.5, label: 'neutral', confidence: 0.5 };
        } catch (error) {
            console.error('Error en análisis de sentimientos:', error);
            return { score: 0.5, label: 'error', confidence: 0 };
        }
    }

    // Detección de toxicidad
    async analyzeToxicity(text) {
        try {
            const response = await fetch(`${this.HF_API_URL}/unitary/toxic-bert`, {
                method: 'POST',
                headers: {
                    'Authorization': this.HF_TOKEN ? `Bearer ${this.HF_TOKEN}` : undefined,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ inputs: text })
            });

            const result = await response.json();
            
            if (result && result[0]) {
                const toxicScore = result[0].find(r => r.label === 'TOXIC')?.score || 0;
                return {
                    score: 1 - toxicScore, // Invertir: menos tóxico = mejor puntuación
                    label: toxicScore > 0.7 ? 'toxic' : 'clean',
                    confidence: Math.abs(toxicScore - 0.5) * 2
                };
            }
            
            return { score: 0.5, label: 'unknown', confidence: 0 };
        } catch (error) {
            console.error('Error en análisis de toxicidad:', error);
            return { score: 0.5, label: 'error', confidence: 0 };
        }
    }

    // Detección de spam
    async analyzeSpam(text) {
        try {
            // Usar modelo de clasificación general para detectar spam
            const response = await fetch(`${this.HF_API_URL}/huggingface/spam-detection`, {
                method: 'POST',
                headers: {
                    'Authorization': this.HF_TOKEN ? `Bearer ${this.HF_TOKEN}` : undefined,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ inputs: text })
            });

            const result = await response.json();
            
            if (result && result[0]) {
                const spamScore = result[0].find(r => r.label === 'SPAM')?.score || 0;
                return {
                    score: 1 - spamScore, // Invertir: menos spam = mejor puntuación
                    label: spamScore > 0.6 ? 'spam' : 'ham',
                    confidence: Math.abs(spamScore - 0.5) * 2
                };
            }
            
            return { score: 0.5, label: 'unknown', confidence: 0 };
        } catch (error) {
            // Si no hay modelo de spam disponible, usar heurísticas
            const spamIndicators = [
                /\b(gratis|free|click|premio|gana|dinero)\b/gi,
                /[!]{3,}/g,
                /[A-Z]{10,}/g
            ];
            
            const spamCount = spamIndicators.reduce((count, pattern) => {
                return count + (text.match(pattern) || []).length;
            }, 0);
            
            const spamScore = Math.min(spamCount * 0.2, 1);
            
            return {
                score: 1 - spamScore,
                label: spamScore > 0.5 ? 'spam' : 'ham',
                confidence: 0.6
            };
        }
    }

    // Decisión final de moderación
    makeModerationDecision(basicCheck, aiAnalysis, report) {
        let finalScore = (basicCheck.score + aiAnalysis.overallScore) / 2;
        let reasons = [...(basicCheck.issues || [])];
        
        // Ajustar puntuación basada en análisis de IA
        if (aiAnalysis.toxicity.score < 0.3) {
            finalScore -= 0.2;
            reasons.push('Contenido potencialmente tóxico detectado');
        }
        
        if (aiAnalysis.spam.score < 0.4) {
            finalScore -= 0.15;
            reasons.push('Posible spam detectado por IA');
        }

        // Bonificaciones para reportes que parecen legítimos
        if (report.scam_type && ['simpe', 'phishing', 'familiar'].includes(report.scam_type)) {
            finalScore += 0.1;
            reasons.push('Tipo de estafa común en Costa Rica');
        }

        // Decidir estado final
        let status, requiresManualReview = false;
        
        if (finalScore >= 0.75) {
            status = 'approved';
        } else if (finalScore <= 0.25) {
            status = 'rejected';
        } else {
            status = 'flagged';
            requiresManualReview = true;
        }

        return {
            action: status,  // Cambiar 'status' por 'action' para consistencia
            confidence: finalScore,  // Mantener como decimal (0.0 - 1.0)
            reason: reasons.join(', ') || 'Análisis automático completado',
            requiresManualReview,
            details: {
                sentiment: aiAnalysis.sentiment,
                toxicity: aiAnalysis.toxicity,
                spam: aiAnalysis.spam
            }
        };
    }
}

module.exports = AutoModerationService;
