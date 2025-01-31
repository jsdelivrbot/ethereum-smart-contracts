//Test file for our factory and our Campaign ethereum contracts.

const assert = require('assert');
const ganache = require('ganache-cli');
const Web3 = require('web3');
const provider = ganache.provider();
const web3 = new Web3(provider);

const compiledFactory = require('../ethereum/build/CampaignFactory.json');
const compiledCampaign = require('../ethereum/build/Campaign.json');

let accounts;
let factory;
let campaignAddress;
let campaign;

beforeEach(async () => {
    //get eth accounts
    accounts = await web3.eth.getAccounts();
    // create our campaign factory and deploy it
    factory = await new web3.eth.Contract(JSON.parse(compiledFactory.interface))
                        .deploy({data: compiledFactory.bytecode })
                        .send({from: accounts[0], gas: 1000000 });
    factory.setProvider(provider);

    //Create a campaign with its constructor method of minimum contribution set.
   await factory.methods.createCampaign('100').send({from: accounts[0], gas: '1000000'});

   const addresses = await factory.methods.getDeployedCampaigns().call();
   campaignAddress = addresses[0];



    campaign = await new web3.eth.Contract(
        JSON.parse(compiledCampaign.interface),
        campaignAddress
    );
    campaign.setProvider(provider);

});

describe('Campaigns', () => {
    it('deploys a factory and a campaign', () => {
        assert(factory.options.address);
        assert(campaign.options.address);
    });

    it('marks caller as the campaign manager', async () => {
        const manager = await campaign.methods.manager().call();
        assert.equal(accounts[0], manager);
    });

    it('allows people to contribute money and makrs them as approvers', async () => {
        await campaign.methods.contribute().send({
            from: accounts[1],
            value: '200'
        });
        const isContributor = await campaign.methods.approvers(accounts[1]).call();
        //If isContributor is true == the person has contributed
        assert(isContributor);
    });

    it('requires a minimum contribution', async () => {
        try{
            await campaign.methods.contribute().send({
                from: accounts[2],
                value: '1'
            });
        } catch(err){
            assert(err);
            return
        }
        assert(false);
    });

    it('allows managers to create requests', async () => {
        await campaign.methods.createRequest(
            'Test request','100',accounts[9]
        ).send({
            from: accounts[0],
            gas: '1000000'
        });

        const request = await campaign.methods.requests(0).call();
        assert.equal('Test request', request.description);
    });

    it('processes requests', async () =>{
        let initialBalance = await web3.eth.getBalance(accounts[9]);
        initialBalance = web3.utils.fromWei(initialBalance, 'ether');
        initialBalance = parseFloat(initialBalance); 
        console.log(initialBalance);

        await campaign.methods.contribute().send({
            from: accounts[0],
            value: web3.utils.toWei('10', 'ether')
        });

        await campaign.methods.createRequest(
            'Test request', web3.utils.toWei('5', 'ether') ,accounts[9]
        ).send({
            from: accounts[0],
            gas: '1000000'
        });

        await campaign.methods.approveRequest(0).send({
            from: accounts[0],
            gas: '1000000'
        });

        await campaign.methods.finalizeRequest(0).send({
            from: accounts[0],
            gas: '1000000'
        });

        let balance = await web3.eth.getBalance(accounts[9]);
        balance = web3.utils.fromWei(balance, 'ether');
        balance = parseFloat(balance);
        console.log(balance)
        assert (balance > initialBalance );
    });

});