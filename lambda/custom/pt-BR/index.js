const Alexa = require('ask-sdk-core');
const persistenceAdapter = require('ask-sdk-s3-persistence-adapter');
// const Util = require('util');
const MyUtil = require('util.js');

const messages = {
	NOME_SKILL: 'Abre a Bíblia para Mim',
	BEM_VINDO: 'Diga para mim por exemplo: "Leia João capítulo três", ou, "Quero ajuda". ',
	BEM_VINDO_VOLTA: 'Bem-vindo de volta! ',
	NAO_ENCONTREI: 'Não encontrei o livro ou o capítulo ou o versículo solicitado. Por favor, pode dizer novamente?',
	DIGA_NOVAMENTE: 'Por favor, pode dizer novamente?',
	TEXTO_AJUDA: 'Eu sou capaz de ler a Bíblia. Diga para mim por exemplo: "Leia João capítulo três", ou, "Alexa, abre a Bíblia para mim João três versículo dezesseis". ',
	LER_O_QUE: 'O quê gostaria que eu lesse?',
	TUDO_BEM: 'Tudo bem.',
	NAO_ENTENDI: 'Desculpe, não consegui entender. Por favor, fale novamente.'
};

const FirstLaunchRequestHandler = {
	canHandle(handlerInput) {
			const attributesManager = handlerInput.attributesManager;
			const sessionAttributes = attributesManager.getSessionAttributes() || {};

			const ja_usou = sessionAttributes.hasOwnProperty('ja_usou') ? sessionAttributes.ja_usou : false;

			return handlerInput.requestEnvelope.request.type === 'LaunchRequest' && !ja_usou;
	},
	async handle(handlerInput) {
		return handlerInput.responseBuilder
			.speak(messages.BEM_VINDO + messages.LER_O_QUE)
			.reprompt(messages.LER_O_QUE)
			.withSimpleCard(messages.NOME_SKILL, messages.BEM_VINDO + messages.LER_O_QUE)
			.getResponse();
	}
};

const LaunchRequestHandler = {
	canHandle(handlerInput) {
		return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
	},
	handle(handlerInput) {
		return handlerInput.responseBuilder
			.speak(messages.BEM_VINDO_VOLTA + messages.LER_O_QUE)
			.reprompt(messages.LER_O_QUE)
			.withSimpleCard(messages.NOME_SKILL, messages.BEM_VINDO_VOLTA + messages.LER_O_QUE)
			.getResponse();
	},
};

const LeiaBibliaIntentHandler = {
	canHandle(handlerInput) {
		return handlerInput.requestEnvelope.request.type === 'IntentRequest'
			&& handlerInput.requestEnvelope.request.intent.name === 'LeiaBibliaIntent';
	},
	async handle(handlerInput) {
		var livro = null;
		var capitulo = null;
		var versiculo = null;
		var s3Object = null;

		try {
			livro = handlerInput.requestEnvelope.request.intent.slots.livro.resolutions.resolutionsPerAuthority[0].values[0].value.id;
			capitulo = handlerInput.requestEnvelope.request.intent.slots.capitulo.resolutions.resolutionsPerAuthority[0].values[0].value.id;

			if(typeof(handlerInput.requestEnvelope.request.intent.slots.versiculo.resolutions) !== "undefined") {
				versiculo = handlerInput.requestEnvelope.request.intent.slots.versiculo.resolutions.resolutionsPerAuthority[0].values[0].value.id;
			}

			try {
				if((livro !== null) && (capitulo !== null) && (versiculo !== null)) {
					s3Object = await MyUtil.getS3Object('Media/nvi/' + livro + '/' + capitulo + '/' + versiculo + '.txt');
				}
				else if((livro !== null) || (capitulo !== null)) {
					s3Object = await MyUtil.getS3Object('Media/nvi/' + livro + '/' + capitulo + '.txt');
				}

				if(s3Object !== null) {
					// console.log(Util.inspect(s3Object));
					const attributesManager = handlerInput.attributesManager;
					const sessionAttributes = attributesManager.getSessionAttributes() || {};

					const ja_usou = sessionAttributes.hasOwnProperty('ja_usou') ? sessionAttributes.ja_usou : false;

					if(!ja_usou) {
						attributesManager.setPersistentAttributes({ 'ja_usou': true });
						await attributesManager.savePersistentAttributes();
					}

					const speechText = s3Object.Body.toString('utf-8');

					if(versiculo !== null) {
						return handlerInput.responseBuilder
							.speak(speechText)
							.withSimpleCard(messages.NOME_SKILL, speechText)
							.withShouldEndSession(true)
							.getResponse();
					}
					else {
						return handlerInput.responseBuilder
							.speak(speechText)
							.withShouldEndSession(true)
							.getResponse();
					}
				}
				else {
					return handlerInput.responseBuilder
						.speak(messages.NAO_ENCONTREI)
						.reprompt(messages.DIGA_NOVAMENTE)
						.withSimpleCard(messages.NOME_SKILL, messages.NAO_ENCONTREI)
						.getResponse();
				}
			}
			catch (e) {
				console.log(`Erro ao pegar o texto no S3: ${e} Dados da requisição: ${JSON.stringify(handlerInput.requestEnvelope.request)}`);

				return handlerInput.responseBuilder
					.speak(messages.NAO_ENCONTREI)
					.reprompt(messages.DIGA_NOVAMENTE)
					.withSimpleCard(messages.NOME_SKILL, messages.NAO_ENCONTREI)
					.getResponse();
			}
		}
		catch (e) {
			console.log(`Erro ao verificar os slots: ${e} Dados da requisição: ${JSON.stringify(handlerInput.requestEnvelope.request)}`);

			return handlerInput.responseBuilder
				.speak(messages.NAO_ENCONTREI)
				.reprompt(messages.DIGA_NOVAMENTE)
				.withSimpleCard(messages.NOME_SKILL, messages.NAO_ENCONTREI)
				.getResponse();
		}
	},
};

const HelpIntentHandler = {
	canHandle(handlerInput) {
		return handlerInput.requestEnvelope.request.type === 'IntentRequest'
			&& handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
	},
	handle(handlerInput) {
		return handlerInput.responseBuilder
			.speak(messages.TEXTO_AJUDA + messages.LER_O_QUE)
			.reprompt(messages.LER_O_QUE)
			.withSimpleCard(messages.NOME_SKILL, messages.TEXTO_AJUDA + messages.LER_O_QUE)
			.getResponse();
	},
};

const CancelAndStopIntentHandler = {
	canHandle(handlerInput) {
		return handlerInput.requestEnvelope.request.type === 'IntentRequest'
			&& (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent'
			|| handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent');
	},
	handle(handlerInput) {
		return handlerInput.responseBuilder
			.speak(messages.TUDO_BEM)
			.withSimpleCard(messages.NOME_SKILL, messages.TUDO_BEM)
			.getResponse();
	},
};

const SessionEndedRequestHandler = {
	canHandle(handlerInput) {
		return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
	},
	handle(handlerInput) {
		console.log(`Sessão encerrada com essa reação: ${handlerInput.requestEnvelope.request.reason}`);

		return handlerInput.responseBuilder.getResponse();
	},
};

const ErrorHandler = {
	canHandle() {
		return true;
	},
	handle(handlerInput, error) {
		console.log(`Erro do manipulador: ${error.message}`);

		return handlerInput.responseBuilder
			.speak(messages.NAO_ENTENDI)
			.reprompt(messages.NAO_ENTENDI)
			.getResponse();
	},
};

const LoadInterceptor = {
	async process(handlerInput) {
		const attributesManager = handlerInput.attributesManager;
		const sessionAttributes = await attributesManager.getPersistentAttributes() || {};

		const ja_usou = sessionAttributes.hasOwnProperty('ja_usou') ? sessionAttributes.ja_usou : false;

		if(ja_usou) {
				attributesManager.setSessionAttributes(sessionAttributes);
		}
	}
};

exports.handler = Alexa.SkillBuilders.custom()
	.withPersistenceAdapter(
		new persistenceAdapter.S3PersistenceAdapter({bucketName:process.env.S3_PERSISTENCE_BUCKET})
	)
	.addRequestHandlers(
		FirstLaunchRequestHandler,
		LaunchRequestHandler,
		LeiaBibliaIntentHandler,
		HelpIntentHandler,
		CancelAndStopIntentHandler,
		SessionEndedRequestHandler)
	.addErrorHandlers(ErrorHandler)
	.addRequestInterceptors(LoadInterceptor)
	.lambda();
