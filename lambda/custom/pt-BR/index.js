const Alexa = require('ask-sdk-core');
// const Util = require('util');
const MyUtil = require('util.js');

const messages = {
    NOME_SKILL: 'Abre a Bíblia para Mim',
    BEM_VINDO: 'Diga para mim por exemplo: "Leia João capítulo três", ou, "Quero ajuda". O quê gostaria que eu lesse?',
    NAO_ENCONTREI: 'Não encontrei o livro ou capítulo ou o versículo solicitado. Por favor, pode dizer novamente?',
    DIGA_NOVAMENTE: 'Por favor, pode dizer novamente?',
    TEXTO_AJUDA: 'Eu sou capaz de ler a Bíblia. Por exemplo: "Leia a Bíblia no evangelho de João capítulo três", ou, "Leia Salmo vinte e três versículo um". O quê gostaria que eu lesse?',
    LER_O_QUE: 'O quê gostaria que eu lesse?',
    TUDO_BEM: 'Tudo bem.',
    NAO_ENTENDI: 'Desculpe, não consegui entender o que disse. Por favor, diga novamente.'
}

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak(messages.BEM_VINDO)
      .reprompt(messages.LER_O_QUE)
      .withSimpleCard(messages.NOME_SKILL, messages.BEM_VINDO)
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
      .speak(messages.TEXTO_AJUDA)
      .reprompt(messages.LER_O_QUE)
      .withSimpleCard(messages.NOME_SKILL, messages.TEXTO_AJUDA)
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

const skillBuilder = Alexa.SkillBuilders.custom();

exports.handler = skillBuilder
  .addRequestHandlers(
    LaunchRequestHandler,
    LeiaBibliaIntentHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler,
    SessionEndedRequestHandler
  )
.addErrorHandlers(ErrorHandler)
.lambda();
