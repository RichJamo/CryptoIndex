// import hre from "hardhat";

const { expect } = require('chai');
const { ethers } = require('hardhat');
const { IUniRouter02_abi } = require('./abi_files/IUniRouter02_abi.js');
const { token_abi } = require('./abi_files/token_abi.js');

const STRATEGY_CONTRACT_TYPE = 'CryptoIndexBinance'; //<-- change strategy type to the contract deployed for this strategy
const ROUTER = "0xcF0feBd3f17CEf5b47b0cD257aCf6025c5BFf3b7"; //<-- ApeSwap  //0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506 <-- SushiSwap

const USDC_ADDRESS = "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d";

const BTCB_ADDRESS = "0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c";
const WETH_ADDRESS = "0x2170ed0880ac9a755fd29b2688956bd959f933f8";
const BNB_ADDRESS = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
const ADA_ADDRESS = "0x3ee2200efb3400fabb9aacf31297cbdd1d435d47";
const XRP_ADDRESS = "0x1d2f0da169ceb9fc7b3144628db156f3f6c60dbe";
const SOL_ADDRESS = "0x570a5d26f7765ecb712c0924e4de545b89fd43df";
const DOT_ADDRESS = "0x7083609fce4d1d8dc0c979aab8c869ea2c873402";
const DOGE_ADDRESS = "0xba2ae424d960c26247dd6c32edc70b295c744c43";
const UNI_ADDRESS = "0xbf5140a22578168fd562dccf235e5d43a02ce9b1";
// const LUNA_ADDRESS = "0xeccf35f941ab67ffcaa9a1265c2ff88865caa005"; //double check
const LTC_ADDRESS = "0x4338665cbb7b2485a8855a139b75d5e34ab0db94"; 
const AVAX_ADDRESS = "0x1CE0c2827e2eF14D5C4f29a091d735A204794041";
const LINK_ADDRESS = "0xF8A0BF9cF54Bb92F17374d9e9A321E6a111a51bD";

const BTC_USD_ORACLE = "0x264990fbd0A4796A3E3d8E37C4d5F87a3aCa5Ebf"
const ETH_USD_ORACLE = "0x9ef1B8c0E4F7dc8bF5719Ea496883DC6401d5b2e"
const BNB_USD_ORACLE = "0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE"
const ADA_USD_ORACLE = "0xa767f745331D267c7751297D982b050c93985627"
const XRP_USD_ORACLE = "0x93A67D414896A280bF8FFB3b389fE3686E014fda"
const SOL_USD_ORACLE = "0x0E8a53DD9c13589df6382F13dA6B3Ec8F919B323"
const DOT_USD_ORACLE = "0xC333eb0086309a16aa7c8308DfD32c8BBA0a2592"
const DOGE_USD_ORACLE = "0x3AB0A0d137D4F946fBB19eecc6e92E64660231C8"
const UNI_USD_ORACLE = "0xb57f259E7C24e56a1dA00F66b55A5640d9f9E7e4"
const LTC_USD_ORACLE = "0x74E72F37A8c415c8f1a98Ed42E78Ff997435791D" //doesn't seem to have an oracle currently?
const AVAX_USD_ORACLE = "" //doesn't yet exist
const LINK_USD_ORACLE = "0xca236E327F629f9Fc2c30A4E95775EbF0B89fac8";


describe('CryptoIndexBinance contract', () => {
    before(async () => {
        [owner, addr1, addr2, _] = await ethers.getSigners();

        CryptoIndexBinance = await ethers.getContractFactory(STRATEGY_CONTRACT_TYPE); //<-- this needs to change for different tests!!
        cryptoIndexBinance = await CryptoIndexBinance.deploy();
     
        await network.provider.send("hardhat_setBalance", [
            owner.address,
            "0x21E19E0C9BAB2400000", //amount of 1000 BNB in hex
        ]);

        uniswapRouter = await ethers.getContractAt(IUniRouter02_abi, ROUTER);
        await uniswapRouter.swapExactETHForTokens(0, [BNB_ADDRESS, USDC_ADDRESS], owner.address, Date.now() + 900, { value: ethers.utils.parseEther("450") })
       
    });

    describe('Transactions', () => {
        it('Should take a 100 USDC deposit from the user and split into the index tokens', async () => {
            //approve
            usdc = await ethers.getContractAt(token_abi, USDC_ADDRESS);
            var usdcBalance = await usdc.balanceOf(owner.address);
            await usdc.approve(cryptoIndexBinance.address, usdcBalance);
            
            //define tokenlist for index
            var token_addresses = [BTCB_ADDRESS, WETH_ADDRESS, BNB_ADDRESS, ADA_ADDRESS, XRP_ADDRESS, DOT_ADDRESS, DOGE_ADDRESS, UNI_ADDRESS, LTC_ADDRESS, LINK_ADDRESS]; //SOL_ADDRESS, 

            //deposit
            await cryptoIndexBinance.depositUserFunds(
                100 * 10 ** 6,
                USDC_ADDRESS,
                owner.address,
                token_addresses
            )
            
            firstTokenInList = await ethers.getContractAt(token_abi, token_addresses[0]);
            balanceFirstTokenInList = await firstTokenInList.balanceOf(cryptoIndexBinance.address);

            expect(balanceFirstTokenInList).to.not.equal(0);
        })
        
        it('Should deposit 100 USDC into the contract', async () => {
            //approve
            usdc = await ethers.getContractAt(token_abi, USDC_ADDRESS);
            var usdcBalance = await usdc.balanceOf(owner.address);
            await usdc.approve(cryptoIndexBinance.address, usdcBalance);
            
            //deposit
            await cryptoIndexBinance.deposit(
                100 * 10 ** 6,
                USDC_ADDRESS,
                owner.address
            )
            
            var usdcBalanceOnContract = await usdc.balanceOf(cryptoIndexBinance.address);
            expect(usdcBalanceOnContract).to.not.equal(0);
        })
        
        it('Should swap from USDC equally into the tokens given', async () => {
            //approve deposit
            usdc = await ethers.getContractAt(token_abi, USDC_ADDRESS);
            var usdcBalance = await usdc.balanceOf(owner.address);
            await usdc.approve(cryptoIndexBinance.address, usdcBalance);
            
            //deposit
            await cryptoIndexBinance.deposit(
                100 * 10 ** 6,
                USDC_ADDRESS,
                owner.address
            )

            //define tokenlist for index
            var token_addresses = [BTCB_ADDRESS, WETH_ADDRESS, BNB_ADDRESS, ADA_ADDRESS, XRP_ADDRESS, DOT_ADDRESS, DOGE_ADDRESS, UNI_ADDRESS, LTC_ADDRESS, LINK_ADDRESS]; //SOL_ADDRESS, DOGE_ADDRESS, 
            
            //approve swap
            await cryptoIndexBinance.approve_spending(USDC_ADDRESS, ROUTER, 100 * 10 ** 6)
            
            //swap
            await cryptoIndexBinance.swapIntoNEqualParts(
                100 * 10 ** 6,
                token_addresses
            )
            
            firstTokenInList = await ethers.getContractAt(token_abi, token_addresses[0]);
            balanceFirstTokenInList = await firstTokenInList.balanceOf(cryptoIndexBinance.address);

            expect(balanceFirstTokenInList).to.not.equal(0);
        })
        
        it('Should get USD balance of a token', async () => {
            btcb_usd_balance = await cryptoIndexBinance.getUSDBalanceOf(
                BTCB_ADDRESS
            )
            expect(btcb_usd_balance).to.not.equal(0);
        })

        it('Should get a price from the oracle', async () => {
            btcb_usd_rate = await cryptoIndexBinance.getLatestPrice(BTC_USD_ORACLE);
            expect(btcb_usd_rate).to.not.equal(0);
        })
        
        it('Should withdraw a users funds from the contract', async () => {
            usdc = await ethers.getContractAt(token_abi, USDC_ADDRESS);
            var usdcBalanceBefore = await usdc.balanceOf(owner.address);

            var token_addresses = [BTCB_ADDRESS, WETH_ADDRESS, BNB_ADDRESS, ADA_ADDRESS, XRP_ADDRESS, DOT_ADDRESS, DOGE_ADDRESS, UNI_ADDRESS, LTC_ADDRESS, LINK_ADDRESS]; //SOL_ADDRESS, DOGE_ADDRESS, 

            await cryptoIndexBinance.withdrawUserFunds(owner.address, token_addresses);
            
            var usdcBalanceAfter = await usdc.balanceOf(owner.address);

            expect(usdcBalanceAfter).to.be.gt(usdcBalanceBefore);
        })
        
    })
})
