pragma solidity ^0.6.12;

//import statements go here
import "./interfaces/IUniswapV2Router02.sol";
import "./interfaces/IUniswapV2Router01.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@chainlink/contracts/src/v0.6/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

import "hardhat/console.sol";
contract CryptoIndexBinance is Ownable, Pausable {
    using SafeMath for uint256;

    address public constant USDC_ADDRESS = 0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d;
    
    address public constant BTCB_ADDRESS = 0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c;
    address public constant WETH_ADDRESS = 0x2170Ed0880ac9A755fd29B2688956BD959F933F8;
    address public constant BNB_ADDRESS = 0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c;
    address public constant ADA_ADDRESS = 0x3EE2200Efb3400fAbB9AacF31297cBdD1d435D47;
    address public constant XRP_ADDRESS = 0x1D2F0da169ceB9fC7B3144628dB156f3F6c60dBE;
    address public constant SOL_ADDRESS = 0x570A5D26f7765Ecb712C0924E4De545B89fD43dF;
    address public constant DOT_ADDRESS = 0x7083609fCE4d1d8Dc0C979AAb8c869Ea2C873402;
    address public constant DOGE_ADDRESS = 0xbA2aE424d960c26247Dd6c32edC70B295c744C43;
    address public constant UNI_ADDRESS = 0xBf5140A22578168FD562DCcF235E5D43A02ce9B1;
    address public constant LTC_ADDRESS = 0x4338665CBB7B2485A8855A139b75D5e34AB0DB94; 
    address public constant LINK_ADDRESS = 0xF8A0BF9cF54Bb92F17374d9e9A321E6a111a51bD; 

    address public constant BTC_USD_ORACLE = 0x264990fbd0A4796A3E3d8E37C4d5F87a3aCa5Ebf;
    address public constant ETH_USD_ORACLE = 0x9ef1B8c0E4F7dc8bF5719Ea496883DC6401d5b2e;
    address public constant BNB_USD_ORACLE = 0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE;
    address public constant ADA_USD_ORACLE = 0xa767f745331D267c7751297D982b050c93985627;
    address public constant XRP_USD_ORACLE = 0x93A67D414896A280bF8FFB3b389fE3686E014fda;
    address public constant SOL_USD_ORACLE = 0x0E8a53DD9c13589df6382F13dA6B3Ec8F919B323;
    address public constant DOT_USD_ORACLE = 0xC333eb0086309a16aa7c8308DfD32c8BBA0a2592;
    address public constant DOGE_USD_ORACLE = 0x3AB0A0d137D4F946fBB19eecc6e92E64660231C8;
    address public constant UNI_USD_ORACLE = 0xb57f259E7C24e56a1dA00F66b55A5640d9f9E7e4;
    address public constant LTC_USD_ORACLE = 0x74E72F37A8c415c8f1a98Ed42E78Ff997435791D; 
    address public constant LINK_USD_ORACLE = 0xca236E327F629f9Fc2c30A4E95775EbF0B89fac8;

    mapping (address => address) public oracle_addresses;

    constructor () public {
        oracle_addresses[BTCB_ADDRESS] = BTC_USD_ORACLE;
        oracle_addresses[WETH_ADDRESS] = ETH_USD_ORACLE;
        oracle_addresses[BNB_ADDRESS] = BNB_USD_ORACLE;
        oracle_addresses[ADA_ADDRESS] = ADA_USD_ORACLE;
        oracle_addresses[XRP_ADDRESS] = XRP_USD_ORACLE;
        oracle_addresses[SOL_ADDRESS] = SOL_USD_ORACLE;
        oracle_addresses[DOT_ADDRESS] = DOT_USD_ORACLE;
        oracle_addresses[DOGE_ADDRESS] = DOGE_USD_ORACLE;
        oracle_addresses[UNI_ADDRESS] = UNI_USD_ORACLE;
        oracle_addresses[LTC_ADDRESS] = LTC_USD_ORACLE;
        oracle_addresses[LINK_ADDRESS] = LINK_USD_ORACLE;

    }
    address public constant SUSHISWAP_ROUTER = 0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506;
    address public constant APESWAP_ROUTER = 0xcF0feBd3f17CEf5b47b0cD257aCf6025c5BFf3b7;

    uint256 public totalNumberOfShares;
    mapping(address => uint256) public userNumberOfShares; 

    IUniswapV2Router02 public router = IUniswapV2Router02(APESWAP_ROUTER);
    //more variables here
    // constructor() autoBalancer public {
    // } 
    
    /**
     * Returns the latest price
     */
    function getLatestPrice(address _oracle_address) public view returns (int) {
        (
            uint80 roundID, 
            int price,
            uint startedAt,
            uint timeStamp,
            uint80 answeredInRound
        ) = AggregatorV3Interface(_oracle_address).latestRoundData();
        return price;
    }

    function updateSharesOnWithdrawal(address user) private { //make this ownable - only contract itself can update this?
        require (userNumberOfShares[user] > 0, "Error - This user has no shares");
        totalNumberOfShares -= userNumberOfShares[user];
        userNumberOfShares[user] = 0;
    }

    function getUserShares(address user) public view returns (uint256 userShares) {
        return userNumberOfShares[user];
    }

    function approve_spending (address token_address, address spender_address, uint256 amount_to_approve) public {
            IERC20(token_address).approve(spender_address, amount_to_approve);
    }
    
     receive() external payable {
    }

    function deposit (uint256 _amount, address token_address, address address_from) public whenNotPaused {
        IERC20 token_ = IERC20(token_address);

        token_.transferFrom(
            address_from, 
            address(this), 
            _amount
        );
    }

    function depositFirstTime (uint256 _amount, address deposit_token_address, address address_from, address[] memory token_addresses) public whenNotPaused {
        deposit(_amount, deposit_token_address, address_from);

        approve_spending(USDC_ADDRESS, APESWAP_ROUTER, _amount);

        swapIntoNEqualParts(_amount, token_addresses);

        setSharesFirstTime(address_from);
    }

    function depositUserFunds (uint256 amount_, address token_address, address address_from, address[] memory token_addresses) public whenNotPaused {
        // TO DO - replace with deposit(amount_, token_address, address_from);
        IERC20 token_ = IERC20(token_address);

        token_.transferFrom(
            address_from, 
            address(this), 
            amount_
        );

        approve_spending(USDC_ADDRESS, APESWAP_ROUTER, amount_);

        //here we need to figure out what we're dealing with... take token_addresses and get USDbalances
        uint256 Total_in_USD;
        uint256[] memory token_USD_balances = new uint256[](token_addresses.length);

        for (uint i; i<token_addresses.length; i++) {
            token_USD_balances[i] = getUSDBalanceOf(token_addresses[i]);
            Total_in_USD = Total_in_USD.add(token_USD_balances[i]);
        }

        if (Total_in_USD > 0) {
            swapProportionately(token_addresses, token_USD_balances, Total_in_USD, amount_);
            uint256 newTotalInUSD;
            for (uint i; i<token_addresses.length; i++) {
                token_USD_balances[i] = getUSDBalanceOf(token_addresses[i]);
                newTotalInUSD = newTotalInUSD.add(token_USD_balances[i]);
            }
            uint256 depositedAmountInUSDAfterSwaps = newTotalInUSD.sub(Total_in_USD);
            updateSharesOnDeposit(address_from, Total_in_USD*10**10, depositedAmountInUSDAfterSwaps*10**10); //from 8 decimals to 18 decimals
        } else {
            swapIntoNEqualParts(amount_, token_addresses);
            setSharesFirstTime(address_from);
        }
    }

    function getUSDBalanceOf(address token_address) public view returns (uint256) {
        uint256 token_decimals = ERC20(token_address).decimals();
        return balanceOf(token_address, address(this))
        .mul(uint256(getLatestPrice(oracle_addresses[token_address])))
        .div(10**(token_decimals+2));
    }

    function swapProportionately(
        address[] memory token_addresses, 
        uint256[] memory token_USD_balances, 
        uint256 totalUSDAmount, 
        uint256 depositAmount
        ) public whenNotPaused
        {
            for (uint i; i<token_addresses.length; i++) {
                if (token_addresses[i] == BNB_ADDRESS) {
                    address[] memory _path = new address[](2);
                    _path[0] = USDC_ADDRESS;
                    _path[1] = BNB_ADDRESS;

                    uint256 token_share = token_USD_balances[i].mul(depositAmount).div(totalUSDAmount);
                    swap(token_share, uint256(0), _path, address(this), uint256(-1));
                } else {
                    address[] memory _path = new address[](3);
                    _path[0] = USDC_ADDRESS;
                    _path[1] = BNB_ADDRESS;
                    _path[2] = token_addresses[i];

                    uint256 token_share = token_USD_balances[i].mul(depositAmount).div(totalUSDAmount);
                    swap(token_share, uint256(0), _path, address(this), uint256(-1));
                }
            }
    }

    function swapIntoNEqualParts(uint256 amount, address[] memory token_addresses) public whenNotPaused {
        for (uint i; i<token_addresses.length; i++) {
            if (token_addresses[i] == BNB_ADDRESS) {
                address[] memory _path = new address[](2);
                _path[0] = USDC_ADDRESS;
                _path[1] = BNB_ADDRESS;
                swap(amount.div(token_addresses.length), uint256(0), _path, address(this), uint256(-1));
            } else {
                address[] memory _path = new address[](3);
                _path[0] = USDC_ADDRESS;
                _path[1] = BNB_ADDRESS;
                _path[2] = token_addresses[i];
                swap(amount.div(token_addresses.length), uint256(0), _path, address(this), uint256(-1));
            }
        }
    }

    function setSharesFirstTime(address user) private {
        userNumberOfShares[user] = 100000000;
        totalNumberOfShares = 100000000;
    }

    function updateSharesOnDeposit(address user, uint256 total_in_USD, uint256 depositedAmountInUSDAfterSwaps) private { //make this ownable - only contract itself can update this?
        uint256 newSharesForUser = depositedAmountInUSDAfterSwaps.mul(totalNumberOfShares).div(total_in_USD);

        totalNumberOfShares = totalNumberOfShares.add(newSharesForUser);
        if (userNumberOfShares[user] > 0) {
            userNumberOfShares[user] = userNumberOfShares[user].add(newSharesForUser);
        } else {
            userNumberOfShares[user] = newSharesForUser;
        }
    }


    function withdrawUserFunds(address user, address[] memory token_addresses) public whenNotPaused {

        for (uint i; i<token_addresses.length; i++) {
            uint256 token_amount = getUserShares(user).mul(balanceOf(token_addresses[i], address(this))).div(totalNumberOfShares);
            approveSpendingWholeBalance(token_addresses[i], APESWAP_ROUTER);
            if (token_addresses[i] == BNB_ADDRESS) {
                address[] memory _path = new address[](2);
                _path[0] = token_addresses[i];
                _path[1] = USDC_ADDRESS;
                swap(token_amount, uint256(0), _path, address(this), uint256(-1));
            } else {
                address[] memory _path = new address[](3);
                _path[0] = token_addresses[i];
                _path[1] = BNB_ADDRESS;
                _path[2] = USDC_ADDRESS;
                swap(token_amount, uint256(0), _path, address(this), uint256(-1));
            }
        }

        approveSpendingWholeBalance(USDC_ADDRESS, user);
        
        uint256 USDC_amount = balanceOf(USDC_ADDRESS, address(this));
        IERC20(USDC_ADDRESS).transfer(user, USDC_amount);

        updateSharesOnWithdrawal(user);
    }

function emergencyWithdrawAll(address user, address[] memory token_addresses) public whenPaused onlyOwner {

        for (uint i; i<token_addresses.length; i++) {
            approveSpendingWholeBalance(token_addresses[i], APESWAP_ROUTER);
            uint256 token_amount = balanceOf(token_addresses[i], address(this));
            if (token_addresses[i] == BNB_ADDRESS) {
                address[] memory _path = new address[](2);
                _path[0] = token_addresses[i];
                _path[1] = USDC_ADDRESS;
                swap(token_amount, uint256(0), _path, address(this), uint256(-1));
            } else {
                address[] memory _path = new address[](3);
                _path[0] = token_addresses[i];
                _path[1] = BNB_ADDRESS;
                _path[2] = USDC_ADDRESS;
                swap(token_amount, uint256(0), _path, address(this), uint256(-1));
            }
        }

        approveSpendingWholeBalance(USDC_ADDRESS, user);
        
        uint256 USDC_amount = balanceOf(USDC_ADDRESS, address(this));
        IERC20(USDC_ADDRESS).transfer(user, USDC_amount);

        //resetShares(); perhaps implement in future?
    }

    function executeNSwaps(
        address[] memory _from, address[] memory _to, uint256[] memory _amount
        ) private {
            for (uint i=0; i<_from.length; i++) {
            executeRebalancingSwap(_from[i], _to[i], _amount[i]);
            }
    }

    function executeRebalancingSwap(address _tokenToSwap, address _tokenSwappingTo, uint256 _amountToBeSwapped) private {
        approve_spending(_tokenToSwap, APESWAP_ROUTER, _amountToBeSwapped);
        if (_tokenToSwap == BNB_ADDRESS || _tokenSwappingTo == BNB_ADDRESS) {
            address[] memory _path = new address[](2);
            _path[0] = _tokenToSwap;
            _path[1] = _tokenSwappingTo;
            swap(_amountToBeSwapped, uint256(0), _path, address(this), uint256(-1));
        } else {
            address[] memory _path = new address[](3);
            _path[0] = _tokenToSwap;
            _path[1] = BNB_ADDRESS;
            _path[2] = _tokenSwappingTo;
            swap(_amountToBeSwapped, uint256(0), _path, address(this), uint256(-1));
        }
        
    }

    function approveSpendingWholeBalance(address _token, address _spender) private {
        uint256 tokenBalance = IERC20(_token).balanceOf(address(this));
        approve_spending(_token, _spender, tokenBalance);
    }
    
    function withdraw_matic(uint256 amount_) public onlyOwner {
        msg.sender.transfer(amount_); //TODO - change?
    }

    function withdrawAllUSDC(address _user) public onlyOwner {
        approveSpendingWholeBalance(USDC_ADDRESS, _user);
        uint256 USDC_amount = balanceOf(USDC_ADDRESS, address(this));
        IERC20(USDC_ADDRESS).transfer(_user, USDC_amount);
    }

    function withdrawAll(address _user, address _token_address) public onlyOwner {
        approveSpendingWholeBalance(_token_address, _user);
        uint256 amount = balanceOf(_token_address, address(this));
        IERC20(_token_address).transfer(_user, amount);
    }

    function balanceOf(address token_address, address user_address) public view returns (uint256 token_balance) {
        IERC20 _token = IERC20(token_address);
        token_balance = _token.balanceOf(user_address);
        return token_balance;
    }
    
    function swap(uint256 _amountIn, uint256 _amountOutMin, address[] memory _path, address _acct, uint256 _deadline) private {
        
       try router.swapExactTokensForTokens(
            _amountIn,
            _amountOutMin,
            _path,
            _acct,
            _deadline) {
                console.log("swap passed");
            } catch {
                console.log("swap failed");
                //could repeat the swap call here? with an if errorCount conditional...
            }
        }   
    
    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }


    }

    
    

    