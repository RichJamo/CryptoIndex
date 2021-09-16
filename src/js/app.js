const DAPP_ADDRESS = "0x16e5899Bb491357ed09F99AA0252458bf778701c"; //insert the address I deployed to

const USDC_ADDRESS = "0x985458E523dB3d53125813eD68c274899e9DfAb4" //one1np293efrmv74xyjcz0kk3sn53x0fm745f2hsuc

const WONE_ADDRESS = "0xcF664087a5bB0237a0BAd6742852ec6c8d69A27a" //one1eanyppa9hvpr0g966e6zs5hvdjxkngn6jtulua
const SUSHI_ADDRESS = "0xBEC775Cb42AbFa4288dE81F387a9b1A3c4Bc552A" //one1hmrhtj6z40ay9zx7s8ec02d350ztc4f2gfax0c
const WETH_ADDRESS = "0x6983D1E6DEf3690C4d616b13597A09e6193EA013" //one1dxparek77d5scntpdvf4j7sfucvnagqnhhfaun
const WBTC_ADDRESS = "0x3095c7557bCb296ccc6e363DE01b760bA031F2d9" //one1xz2uw4tmev5kenrwxc77qxmkpwsrrukel9ucc5

const ONE_USD_ORACLE = "0xcEe686F89bc0dABAd95AEAAC980aE1d97A075FAD" //one1emngd7ymcrdt4k26a2kfszhpm9aqwhadx06kmr
const SUSHI_USD_ORACLE = "0x90142a6930ecF80F1d14943224C56CFe0CD0d347" //one1jq2z56fsanuq78g5jsezf3tvlcxdp568yjcafg
const ETH_USD_ORACLE = "0x4f11696cE92D78165E1F8A9a4192444087a45b64" //one1fugkjm8f94upvhsl32dyryjygzr6gkmyz9zrk6
const WBTC_USD_ORACLE = "0xEF637736B220a58C661bfF4b71e03ca898DCC0Bd" //one1aa3hwd4jyzjccesmla9hrcpu4zvdes9az7kqfn

const SUSHISWAP_ROUTER = "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506" //one1rvpd4r9s6zt7hr2h596m3rra3drejagxen2var


var user;

const provider = new ethers.providers.Web3Provider(window.ethereum)
const signer = provider.getSigner()

const dappContract_signer = new ethers.Contract(DAPP_ADDRESS, sushi_index_abi, signer);
const dappContract_provider = new ethers.Contract(DAPP_ADDRESS, sushi_index_abi, provider);

/*****************************************/
/* Detect the MetaMask Ethereum provider */
/*****************************************/

//check that we are connected to Harmony network
var chainId = await checkNetworkId(provider)
if (chainId !== 1666600000) {
  console.log("Please change to Harmony network") //TODO make this an alert to the user...
  try {
    await ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0x63564C40' }], //1666600000 in 0x padded hexadecimal form is 0x63564C40
    });
    window.location.reload();
  } catch (switchError) {
    // This error code indicates that the chain has not been added to MetaMask.
    if (error.code === 4902) {
      try {
        await ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{ chainId: '0x63564C40', rpcUrl: 'https://api.s0.t.hmny.io' /* ... */ }],
        });
      } catch (addError) {
        // handle "add" error
      }
    }
    // handle other "switch" errors
  }
}

if (provider) {
  startApp(provider); // Initialize your app
} else {
  console.log('Please install MetaMask!');
}

async function checkNetworkId(_provider) {
  try {
    var network = await provider.getNetwork();
    return network["chainId"];
  }
  catch (error) {
    console.log(error);
  }
}

async function startApp(provider) {
  const depositButton = document.getElementById('depositButton');
  const approveButton = document.getElementById('approveButton');

  const withdrawToUserButton = document.getElementById('withdraw_BB_to_user');

  const accounts = await ethereum.request({ method: 'eth_accounts' });
  user = accounts[0];

  await displayBalances();

  await displayUSDBalances();

  approveButton.addEventListener('click', async () => {
    var depositAmountUSDC = $("#depositAmountUSDC").val(); //put in some checks here? positive number, between x and y, user has enough funds...
    await giveApprovalFromUser(USDC_ADDRESS, DAPP_ADDRESS, ethers.utils.parseUnits(depositAmountUSDC.toString(), 6));
  })

  depositButton.addEventListener('click', async () => {
    var depositAmountUSDC = $("#depositAmountUSDC").val(); //put in some checks here? positive number, between x and y, user has enough funds...
    console.log(`Depositing ${depositAmountUSDC} of USDC to the SushiIndex account`);
    $("#swapStarted").css("display", "block");
    $("#swapStarted").text(`Depositing ${depositAmountUSDC} of USDC to the SushiIndex account`);
    var array_coins = await getTokenInfo(DAPP_ADDRESS);
    var WMATIC_balanceInUSD = array_coins[0].usd_balance;
    console.log(WMATIC_balanceInUSD);
    var SUSHI_balanceInUSD = array_coins[1].usd_balance;
    console.log(SUSHI_balanceInUSD);
    var WETH_balanceInUSD = array_coins[2].usd_balance;
    console.log(WETH_balanceInUSD);
    var WBTC_balanceInUSD = array_coins[3].usd_balance;
    console.log(WBTC_balanceInUSD);

    var total_in_USD = WMATIC_balanceInUSD + SUSHI_balanceInUSD + WETH_balanceInUSD + WBTC_balanceInUSD;
    if (total_in_USD > 0) {
      //var estimatedGasLimit = await dappContract_signer.estimateGas.depositUserFunds(depositAmountUSDC * 10 ** 6, USDC_ADDRESS, user, DAPP_ADDRESS);
      await dappContract_signer.depositUserFunds(depositAmountUSDC * 10 ** 6,
        USDC_ADDRESS,
        user,
        parseInt(WMATIC_balanceInUSD * 10 ** 6),
        parseInt(SUSHI_balanceInUSD * 10 ** 6),
        parseInt(WETH_balanceInUSD * 10 ** 6),
        parseInt(WBTC_balanceInUSD * 10 ** 6))
      //{ gasLimit: parseInt(estimatedGasLimit * 1.2) });
    } else {
      // dappContract_signer.deposit(depositAmountUSDC * 10 ** 6, USDC_ADDRESS, user);
      dappContract_signer.depositFirstTime (depositAmountUSDC * 10 ** 6, USDC_ADDRESS, user);
      // var tokenContract = new ethers.Contract(USDC_ADDRESS, token_abi, signer);
      // try {
      //   console.log(depositAmountUSDC * 10 ** 6);
      //   await tokenContract.transfer(
      //     DAPP_ADDRESS,
      //     depositAmountUSDC * 10 ** 6
      //   );//need to catch an error here - perhaps make this it's own function!
      // } catch (error) {
      //   console.log(error)
      // }
      //dappContract_signer.deposit(depositAmountUSDC * 10 ** 6, USDC_ADDRESS, user);
      // dappContract_signer.approve_spending(USDC_ADDRESS, SUSHISWAP_ROUTER, depositAmountUSDC * 10 ** 6);
      // dappContract_signer.swapIntoFourEqualParts(depositAmountUSDC * 10 ** 6);
      // dappContract_signer.swap(250000, 0, [USDC_ADDRESS, WONE_ADDRESS], user, 11111111111);
      // dappContract_signer.swap(250000, 0, [USDC_ADDRESS, SUSHI_ADDRESS], user, 11111111111);
      // dappContract_signer.swap(250000, 0, [USDC_ADDRESS, WETH_ADDRESS], user, 11111111111);
      //dappContract_signer.swap(50000, 0, [USDC_ADDRESS, WONE_ADDRESS, WBTC_ADDRESS], user, 11111111111);
      //dappContract_signer.setSharesFirstTime(user);
    }
  })

  withdrawToUserButton.addEventListener('click', async () => {
    //put in gas estimation here
    await dappContract_signer.withdrawUserFunds(user);
    // var userShares = await dappContract_signer.getUserShares(user);
    // var totalShares = await dappContract_signer.totalNumberOfShares();
    // console.log(userShares);
    // console.log(totalShares);

    // var WONE_amount = userShares.mul(await dappContract_signer.balanceOf(WONE_ADDRESS, DAPP_ADDRESS)).div(totalShares);
    // // var SUSHI_amount = userShares.mul(await dappContract_signer.balanceOf(SUSHI_ADDRESS, DAPP_ADDRESS)).div(totalShares);
    // // var WETH_amount = userShares.mul(await dappContract_signer.balanceOf(WETH_ADDRESS, DAPP_ADDRESS)).div(totalShares);
    // // var WBTC_amount = userShares.mul(await dappContract_signer.balanceOf(WBTC_ADDRESS, DAPP_ADDRESS)).div(totalShares);
    // // console.log(WONE_amount);
    // // console.log(SUSHI_amount);
    // // console.log(WETH_amount);
    // // console.log(WBTC_amount);

    // dappContract_signer.approveSpendingWholeBalance(WONE_ADDRESS, SUSHISWAP_ROUTER);
    // // dappContract_signer.approveSpendingWholeBalance(SUSHI_ADDRESS, SUSHISWAP_ROUTER);
    // // dappContract_signer.approveSpendingWholeBalance(WETH_ADDRESS, SUSHISWAP_ROUTER);
    // // dappContract_signer.approveSpendingWholeBalance(WBTC_ADDRESS, SUSHISWAP_ROUTER);

    // dappContract_signer.swapBackToUSDC(WONE_ADDRESS, WONE_amount);
    // dappContract_signer.swapBackToUSDC(SUSHI_ADDRESS, SUSHI_amount);
    // dappContract_signer.swapBackToUSDC(WETH_ADDRESS, WETH_amount);
    // dappContract_signer.swapBackToUSDC(WBTC_ADDRESS, WBTC_amount);

    // dappContract_signer.approveSpendingWholeBalance(USDC_ADDRESS, user);
        
    // var USDC_amount = dappContract.signer.balanceOf(USDC_ADDRESS, DAPP_ADDRESS);
    // tokenContract = new ethers.Contract(USDC_ADDRESS, token_abi, provider);
    // tokenContract.transferFrom(DAPP_ADDRESS, user, USDC_amount);

    // dappContract_signer.updateSharesOnWithdrawal(user);
  })
}

async function displayBalances() {
  getWONEResult.innerHTML = parseFloat(ethers.utils.formatUnits(await getBalance(WONE_ADDRESS, DAPP_ADDRESS), 18)).toFixed(6) || 'Not able to get accounts';

  getSUSHIResult.innerHTML = parseFloat(ethers.utils.formatUnits(await getBalance(SUSHI_ADDRESS, DAPP_ADDRESS), 18)).toFixed(6) || 'Not able to get accounts';

  getWBTCResult.innerHTML = parseFloat(ethers.utils.formatUnits(await getBalance(WBTC_ADDRESS, DAPP_ADDRESS), 8)).toFixed(6) || 'Not able to get accounts';

  getWETHResult.innerHTML = parseFloat(ethers.utils.formatUnits(await getBalance(WETH_ADDRESS, DAPP_ADDRESS), 18)).toFixed(6) || 'Not able to get accounts';
}

async function displayUSDBalances() {
  var array_coins = await getTokenInfo(DAPP_ADDRESS);
  var wone_usd = array_coins[0].usd_balance;
  WONEInUsd.innerHTML = wone_usd.toFixed(2) || 'Not able to get accounts'; //8 decimals for oracle input, 18 for WONE
  var sushi_usd = array_coins[1].usd_balance;
  SUSHIInUsd.innerHTML = sushi_usd.toFixed(2) || 'Not able to get accounts';
  var wbtc_usd = array_coins[2].usd_balance;
  WBTCInUsd.innerHTML = wbtc_usd.toFixed(2) || 'Not able to get accounts';
  var weth_usd = array_coins[3].usd_balance;
  WETHInUsd.innerHTML = weth_usd.toFixed(2) || 'Not able to get accounts';

  var total_in_usd = wone_usd + sushi_usd + wbtc_usd + weth_usd;
  TotalInUSD.innerHTML = '$ ' + total_in_usd.toFixed(2);

  var userShares = (await dappContract_provider.getUserShares(user)).toNumber()
  var totalShares = (await dappContract_provider.totalNumberOfShares()).toNumber() //lesson here - overwriting public variable getter function??
  UserShareInPerc.innerHTML = (userShares / totalShares * 100).toFixed(1) + '%'; //can add a percentage thingie here!
  USERshareInUSD.innerHTML = '$ ' + (userShares / totalShares * total_in_usd).toFixed(2); //TODO - neaten up this fix
}

async function getTokenInfo(accountOrContract) {

  function Coin(symbol, address, oracleAddress, decimals, balance, usd_balance, diff_from_average, usd_exchange_rate) { //in JS we create an object type by using a constructor function
    this.symbol = symbol;
    this.address = address;
    this.oracleAddress = oracleAddress;
    this.decimals = decimals;
    this.balance = balance;
    this.usd_balance = usd_balance;
    this.diff_from_average = diff_from_average;
    this.usd_exchange_rate = usd_exchange_rate;
  }

  //create a coin object for each of our 4 assets
  var WONE = new Coin("WONE", WONE_ADDRESS, ONE_USD_ORACLE);
  var SUSHI = new Coin("SUSHI", SUSHI_ADDRESS, SUSHI_USD_ORACLE);
  var WBTC = new Coin("WBTC", WBTC_ADDRESS, WBTC_USD_ORACLE);
  var WETH = new Coin("WETH", WETH_ADDRESS, ETH_USD_ORACLE);

  var array_coins = [WONE, SUSHI, WBTC, WETH];
  var total_in_usd = 0;

  for (let coin of array_coins) {
    coin.balance = await getBalance(coin.address, accountOrContract);
    coin.usd_exchange_rate = await getExchangeRate(coin.oracleAddress);
    coin.decimals = await getDecimals(coin.address);
    coin.usd_balance = parseFloat(
      (parseFloat(
        ethers.utils.formatUnits(coin.balance, coin.decimals))
        * parseFloat(ethers.utils.formatUnits(coin.usd_exchange_rate, 8)
        ))
        .toFixed(6)
    );
    total_in_usd += coin.usd_balance;
  }

  var no_of_assets = array_coins.length;
  var target_per_asset = total_in_usd / no_of_assets;
  for (let coin of array_coins) {
    coin.diff_from_average = coin.usd_balance - target_per_asset;
  }

  return array_coins;
}

async function giveApprovalFromUser(token_address, router_address, amountIn) {
  // create a new instance of a contract
  var tokenContract = new ethers.Contract(token_address, token_abi, signer)
  // give router_address approval to spend user's tokens
  try {
    var approved = await tokenContract.approve(router_address, amountIn); //approve(spender, amount)
    return approved;

  } catch (error) {
    console.log(error)
  }
}

async function getBalance(token_address, accountOrContract) {
  var tokenContract = new ethers.Contract(token_address, token_abi, provider)
  try {
    var token_balance = await tokenContract.balanceOf(accountOrContract);//need to catch an error here - perhaps make this it's own function!
    return token_balance;
  } catch (error) {
    console.log(error)
  }
}

async function getExchangeRate(oracle_address) {
  const provider_testnet = new ethers.getDefaultProvider("https://api.s0.b.hmny.io");
  const aggregatorV3InterfaceABI = [{ "inputs": [], "name": "decimals", "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "description", "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "uint80", "name": "_roundId", "type": "uint80" }], "name": "getRoundData", "outputs": [{ "internalType": "uint80", "name": "roundId", "type": "uint80" }, { "internalType": "int256", "name": "answer", "type": "int256" }, { "internalType": "uint256", "name": "startedAt", "type": "uint256" }, { "internalType": "uint256", "name": "updatedAt", "type": "uint256" }, { "internalType": "uint80", "name": "answeredInRound", "type": "uint80" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "latestRoundData", "outputs": [{ "internalType": "uint80", "name": "roundId", "type": "uint80" }, { "internalType": "int256", "name": "answer", "type": "int256" }, { "internalType": "uint256", "name": "startedAt", "type": "uint256" }, { "internalType": "uint256", "name": "updatedAt", "type": "uint256" }, { "internalType": "uint80", "name": "answeredInRound", "type": "uint80" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "version", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }];
  const addr = oracle_address;
  const priceFeed = new ethers.Contract(addr, aggregatorV3InterfaceABI, provider_testnet);

  try {
    var result = await priceFeed.latestRoundData();
    console.log("Latest Round Data", result[1]);
    return result[1]; //returns in BigNumber format
  } catch (error) {
    console.log(error);
  }
}

async function getDecimals(token_address) {
  var tokenContract = new ethers.Contract(token_address, token_abi, provider)
  // check how many decimals that token has
  try {
    var decimals = await tokenContract.decimals();//need to catch an error here - perhaps make this it's own function!
    return decimals;
  } catch (error) {
    console.log(error);
  }
}





